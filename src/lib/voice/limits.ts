/**
 * The voice questions' limits (DESIGN.md section 10, "Ask by voice"), and the
 * pure decision over today's counts. Safe to import in the browser: the copy
 * shows MAX_TRANSCRIPTIONS_PER_DAY, and the recorder stops at
 * MAX_RECORDING_MS. Reading and writing the counts lives in store.ts.
 */

/** Transcriptions one visitor may ask for per UTC day. */
export const MAX_TRANSCRIPTIONS_PER_DAY = 20;

/**
 * Seconds of audio transcribed across everyone per UTC day: 150 minutes,
 * which Whisper on Workers AI turns into about 7,000 neurons, inside the
 * 10,000 a day that are free.
 */
export const DAILY_AUDIO_SECONDS = 150 * 60;

/** The recorder stops itself this long after it starts. */
export const MAX_RECORDING_MS = 30_000;

/**
 * The most audio the endpoint takes. A little over MAX_RECORDING_MS, since a
 * recorder stops a few frames late.
 */
export const MAX_AUDIO_SECONDS = 30.5;

/** The most bytes the endpoint reads: a 30.5s 16 kHz mono 16-bit WAV is 976,044. */
export const MAX_AUDIO_BYTES = 1_000_000;

/** Whether the recorder should stop itself, `elapsedMs` after it started. */
export function shouldStop(elapsedMs: number): boolean {
  return elapsedMs >= MAX_RECORDING_MS;
}

export type TranscribeLimit = "daily_limit" | "visitor_limit";

/**
 * Whether one more transcription of `seconds` may reach the model today. The
 * site's minutes are checked first: when they're spent, nobody gets through,
 * whatever their own count.
 */
export function checkTranscribeLimits(
  today: { visitorTranscriptions: number; audioSeconds: number },
  seconds: number,
): { ok: true } | { ok: false; limit: TranscribeLimit } {
  if (today.audioSeconds + seconds > DAILY_AUDIO_SECONDS)
    return { ok: false, limit: "daily_limit" };
  if (today.visitorTranscriptions >= MAX_TRANSCRIPTIONS_PER_DAY) {
    return { ok: false, limit: "visitor_limit" };
  }
  return { ok: true };
}
