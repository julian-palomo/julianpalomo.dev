import { useEffect, useRef, useState } from "react";
import { transcribeErrorSchema, transcriptSchema } from "../../lib/voice/api";
import { shouldStop } from "../../lib/voice/limits";
import { encodeWav, toMono16k } from "../../lib/voice/wav";

export type VoiceError = "denied" | "noSpeech" | "visitorLimit" | "dailyLimit" | "failed";

export type Voice =
  | { status: "idle" }
  | { status: "recording"; elapsedMs: number }
  | { status: "transcribing" }
  | { status: "error"; error: VoiceError };

/** The live recording: the microphone's stream, its recorder and the clock that stops it. */
type Live = {
  stream: MediaStream;
  recorder: MediaRecorder;
  since: number;
  tick: ReturnType<typeof setInterval>;
  /** The chat went or the page was left: stop without transcribing. */
  discard: boolean;
};

// How often the elapsed time on the button updates, and the 30s stop is checked.
const TICK_MS = 250;

/** Whether this browser can record: MediaRecorder and getUserMedia both there. */
function canRecord(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** The recording as the WAV /api/transcribe takes, decoded and resampled by the browser itself. */
async function toWav(recording: Blob): Promise<Uint8Array<ArrayBuffer>> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await recording.arrayBuffer());
    const channels = Array.from({ length: audio.numberOfChannels }, (_, index) =>
      audio.getChannelData(index),
    );
    return encodeWav(toMono16k(channels, audio.sampleRate));
  } finally {
    void context.close();
  }
}

/** What went wrong, from the endpoint's error code. */
function fromCode(json: unknown): VoiceError {
  const parsed = transcribeErrorSchema.safeParse(json);
  if (!parsed.success) return "failed";
  if (parsed.data.error === "visitor_limit") return "visitorLimit";
  if (parsed.data.error === "daily_limit") return "dailyLimit";
  return "failed";
}

/**
 * A question asked by voice (DESIGN.md section 10): the browser records it
 * for at most 30s, turns it into a WAV and sends it to /api/transcribe, and
 * `onText` gets the words, which go into the composer; nothing is sent. The
 * microphone is turned off on every way out: a stop, the 30s cap, an error,
 * the chat going away and the page being left.
 */
export function useVoice(onText: (text: string) => void) {
  const [voice, setVoice] = useState<Voice>({ status: "idle" });
  // Read after hydration: the server can't know, and renders without the button.
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(canRecord()), []);
  const live = useRef<Live | null>(null);
  const onTextNow = useRef(onText);
  useEffect(() => {
    onTextNow.current = onText;
  });

  /** Turns the microphone off and forgets the recording. */
  function release() {
    const current = live.current;
    if (!current) return;
    clearInterval(current.tick);
    for (const track of current.stream.getTracks()) track.stop();
    live.current = null;
  }

  function stop() {
    const recorder = live.current?.recorder;
    if (recorder?.state === "recording") recorder.stop();
  }

  async function transcribe(recording: Blob) {
    setVoice({ status: "transcribing" });
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: await toWav(recording),
      });
      const json: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        setVoice({ status: "error", error: fromCode(json) });
        return;
      }
      const parsed = transcriptSchema.safeParse(json);
      if (!parsed.success) setVoice({ status: "error", error: "failed" });
      else if (parsed.data.text === "") setVoice({ status: "error", error: "noSpeech" });
      else {
        setVoice({ status: "idle" });
        onTextNow.current(parsed.data.text);
      }
    } catch {
      setVoice({ status: "error", error: "failed" });
    }
  }

  async function start() {
    if (live.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      setVoice({ status: "error", error: denied ? "denied" : "failed" });
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const discarded = live.current?.discard ?? true;
      release();
      if (!discarded) void transcribe(new Blob(chunks, { type: recorder.mimeType }));
    };
    recorder.onerror = () => {
      release();
      setVoice({ status: "error", error: "failed" });
    };
    const since = performance.now();
    const tick = setInterval(() => {
      const elapsedMs = performance.now() - since;
      if (shouldStop(elapsedMs)) stop();
      else setVoice({ status: "recording", elapsedMs });
    }, TICK_MS);
    live.current = { stream, recorder, since, tick, discard: false };
    recorder.start();
    setVoice({ status: "recording", elapsedMs: 0 });
  }

  // The microphone goes off when the chat goes, an inner page included, or
  // the page is left, and nothing is transcribed then.
  // biome-ignore lint/correctness/useExhaustiveDependencies: release and stop only read refs.
  useEffect(() => {
    const leave = () => {
      if (live.current) live.current.discard = true;
      stop();
      release();
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, []);

  return {
    voice,
    supported,
    start: () => void start(),
    stop,
    /** A keystroke or a press after an error clears it. */
    clearError: () => setVoice((now) => (now.status === "error" ? { status: "idle" } : now)),
  };
}
