/**
 * Today's counts behind the voice questions' limits, in D1 (migration 0005).
 * Server only: endpoint.ts is the one importer. Like the chat's counts, two
 * requests can read the same count and both pass, so a visitor or the site
 * can go over by one transcription; that is accepted rather than locked.
 */
import type { D1Like } from "../bot/usage";

export type TranscribeStore = {
  readToday(
    day: string,
    visitor: string,
  ): Promise<{ visitorTranscriptions: number; audioSeconds: number }>;
  /** One more transcription for the visitor, and its seconds for the site. */
  count(day: string, visitor: string, seconds: number): Promise<void>;
};

export function d1TranscribeStore(db: D1Like): TranscribeStore {
  return {
    async readToday(day, visitor) {
      const [mine, site] = await Promise.all([
        db
          .prepare(
            "SELECT transcriptions FROM visitor_transcriptions WHERE visitor_hash = ? AND day = ?",
          )
          .bind(visitor, day)
          .first<{ transcriptions: number }>(),
        db
          .prepare("SELECT audio_seconds FROM daily_transcription WHERE day = ?")
          .bind(day)
          .first<{ audio_seconds: number }>(),
      ]);
      return {
        visitorTranscriptions: mine?.transcriptions ?? 0,
        audioSeconds: site?.audio_seconds ?? 0,
      };
    },

    async count(day, visitor, seconds) {
      await Promise.all([
        db
          .prepare(
            `INSERT INTO visitor_transcriptions (visitor_hash, day, transcriptions) VALUES (?, ?, 1)
             ON CONFLICT (visitor_hash, day) DO UPDATE SET transcriptions = transcriptions + 1`,
          )
          .bind(visitor, day)
          .run(),
        db
          .prepare(
            `INSERT INTO daily_transcription (day, audio_seconds) VALUES (?, ?)
             ON CONFLICT (day) DO UPDATE SET audio_seconds = audio_seconds + excluded.audio_seconds`,
          )
          .bind(day, seconds)
          .run(),
      ]);
    },
  };
}
