-- Daily counts behind the voice questions' limits (src/lib/voice/store.ts).
-- Days are UTC dates as YYYY-MM-DD. No IP, no audio and no text is ever
-- stored: a visitor is the same daily hash as the chat's (0001), and the site
-- counts only seconds of audio.

-- Transcriptions per visitor per day (MAX_TRANSCRIPTIONS_PER_DAY).
CREATE TABLE visitor_transcriptions (
  visitor_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  transcriptions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_hash, day)
);

-- Seconds of audio sent to Workers AI across everyone, one row per day
-- (DAILY_AUDIO_SECONDS).
CREATE TABLE daily_transcription (
  day TEXT PRIMARY KEY,
  audio_seconds INTEGER NOT NULL DEFAULT 0
);
