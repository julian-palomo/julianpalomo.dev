import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useLocale } from "../i18n/useLocale";
import { boopOnHover } from "../ui/boop";
import { IconButton } from "../ui/IconButton";
import type { Voice } from "./use-voice";

// On hover the microphone tilts and springs back a little past rest, as if picked up.
const onHover = boopOnHover({
  parts: [
    {
      part: "mic",
      spring: springs.boop,
      frame: (value) => ({ transform: `rotate(${15 * value}deg)` }),
    },
  ],
});

type Props = {
  voice: Voice;
  /** The composer can't send now, so it can't take a question by voice either. */
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
};

/** 0:07: the seconds recorded so far. */
function elapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const recordingPill =
  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 font-display text-[13px] font-bold text-on-accent tabular-nums transition-transform duration-[80ms] motion-safe:active:scale-[0.92]";

/**
 * The microphone next to Send (DESIGN.md section 10), "Ask by voice". While
 * it records it's a stop button with the time so far; while the words come
 * back it waits, disabled.
 */
export function VoiceButton({ voice, disabled, onStart, onStop }: Props) {
  const locale = useLocale();
  if (voice.status === "recording") {
    return (
      <button
        type="button"
        aria-label={t(locale, "stopRecording")}
        onClick={onStop}
        className={recordingPill}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
        <span aria-hidden="true">{elapsed(voice.elapsedMs)}</span>
      </button>
    );
  }
  const transcribing = voice.status === "transcribing";
  return (
    <IconButton
      look="tint"
      label={t(locale, "askByVoice")}
      disabled={disabled || transcribing}
      aria-busy={transcribing || undefined}
      onPointerEnter={onHover}
      onClick={onStart}
    >
      <MicIcon />
    </IconButton>
  );
}

function MicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 origin-center"
      data-boop="mic"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}
