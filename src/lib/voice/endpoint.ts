/**
 * POST /api/transcribe (src/routes/api/transcribe.ts): a recorded question in,
 * its text out, through Whisper on Workers AI (docs/adr/, "Ask by voice
 * through Workers AI"). Server only. The audio and its text are never stored
 * and never logged: a failure logs its code alone.
 */
import { Buffer } from "node:buffer";
import { z } from "zod";
import { type D1Like, isD1, utcDay, visitorHash } from "../bot/usage";
import { DEMO_TRANSCRIPT, type TranscribeErrorCode, transcriptSchema } from "./api";
import { checkTranscribeLimits, MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS } from "./limits";
import { d1TranscribeStore, type TranscribeStore } from "./store";
import { readWav } from "./wav";

export const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";

/** How long demo mode waits before its fixed sentence, like a short transcription. */
const DEMO_DELAY_MS = 800;

// The visitor id when there's no CF-Connecting-IP, as on a local Worker.
const LOCAL_VISITOR_IP = "local";

/**
 * The part of the Workers AI binding this module uses (`env.AI.run`, from
 * Cloudflare's Workers AI binding docs). Written by hand, like D1Like:
 * docs/tech-debt.md.
 */
type AiLike = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

/** True when a binding looks like Workers AI, so a missing or wrong binding fails closed. */
function isAi(value: unknown): value is AiLike {
  return (
    typeof value === "object" && value !== null && "run" in value && typeof value.run === "function"
  );
}

// A missing, empty or malformed value reads as unset, never as an error.
const envSchema = z.object({
  BOT_DEMO: z.string().optional().catch(undefined),
  VISITOR_SALT: z.string().trim().min(1).optional().catch(undefined),
  // Checked with isD1 and isAi where they are used.
  DB: z.unknown().optional(),
  AI: z.unknown().optional(),
});

const STATUS: Record<TranscribeErrorCode, number> = {
  too_large: 413,
  bad_audio: 415,
  too_long: 422,
  visitor_limit: 429,
  daily_limit: 429,
  unavailable: 503,
  failed: 502,
};

function errorResponse(error: TranscribeErrorCode): Response {
  return Response.json({ error }, { status: STATUS[error] });
}

export type Deps = {
  createStore: (db: D1Like) => TranscribeStore;
  wait: (ms: number) => Promise<void>;
};

const defaultDeps: Deps = {
  createStore: d1TranscribeStore,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * The body, or null when it's longer than MAX_AUDIO_BYTES. A declared length
 * over the cap is refused unread; any other body, with no length (chunked) or
 * a wrong one, is read only until it passes the cap, never whole, so a long
 * upload can't fill memory.
 */
async function readBody(request: Request): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) return null;
  if (request.body === null) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AUDIO_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Answers a POST to /api/transcribe. `env` is the Worker's environment, unparsed. */
export async function handleTranscribe(
  request: Request,
  env: unknown,
  overrides: Partial<Deps> = {},
): Promise<Response> {
  const deps: Deps = { ...defaultDeps, ...overrides };
  const parsedEnv = envSchema.safeParse(env);
  if (!parsedEnv.success) return errorResponse("unavailable");
  const { BOT_DEMO, VISITOR_SALT: salt, DB, AI } = parsedEnv.data;
  // BOT_DEMO wins, binding or not: previews and e2e set it, so they never
  // call Workers AI or need D1, and production never sets it. Otherwise a
  // real call needs the binding and the limits in front of it, or nothing
  // happens at all.
  const demo = BOT_DEMO === "1";
  if (!demo && (!isAi(AI) || !isD1(DB) || salt === undefined)) return errorResponse("unavailable");

  // The audio is checked in demo too, so a preview tries the browser's
  // recording and its WAV end to end, and only Whisper is faked.
  const type = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "audio/wav") return errorResponse("bad_audio");
  const bytes = await readBody(request);
  if (bytes === null) return errorResponse("too_large");
  const wav = readWav(bytes);
  if (wav === null) return errorResponse("bad_audio");
  if (wav.seconds > MAX_AUDIO_SECONDS) return errorResponse("too_long");

  if (demo) {
    await deps.wait(DEMO_DELAY_MS);
    return Response.json({ text: DEMO_TRANSCRIPT });
  }
  // Checked above; repeated so TypeScript knows them here.
  if (!isAi(AI) || !isD1(DB) || salt === undefined) return errorResponse("unavailable");

  // The limits, counted before the call, so a failed call still costs a try,
  // as the chat's do. D1 failing fails closed.
  try {
    const store = deps.createStore(DB);
    const day = utcDay();
    const ip = request.headers.get("CF-Connecting-IP") ?? LOCAL_VISITOR_IP;
    const visitor = await visitorHash(ip, day, salt);
    const seconds = Math.ceil(wav.seconds);
    const verdict = checkTranscribeLimits(await store.readToday(day, visitor), seconds);
    if (!verdict.ok) return errorResponse(verdict.limit);
    await store.count(day, visitor, seconds);
  } catch {
    console.error("transcribe: limits unavailable");
    return errorResponse("unavailable");
  }

  try {
    // No `language`: in Whisper it fixes the language instead of hinting it,
    // so an English question on /es would come out wrong. It detects English
    // and Spanish on its own. vad_filter trims silence, so a recording with
    // no speech comes back empty.
    const result = await AI.run(WHISPER_MODEL, {
      audio: Buffer.from(bytes).toString("base64"),
      vad_filter: true,
    });
    const parsed = transcriptSchema.safeParse(result);
    if (!parsed.success) {
      console.error("transcribe: unexpected answer from the model");
      return errorResponse("failed");
    }
    return Response.json({ text: parsed.data.text.trim() });
  } catch {
    console.error("transcribe: the model failed");
    return errorResponse("failed");
  }
}
