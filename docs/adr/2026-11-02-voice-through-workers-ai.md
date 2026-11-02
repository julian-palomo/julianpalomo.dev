# Ask by voice through Workers AI, not the browser's speech API

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Julian wants visitors to be able to ask the assistant by voice, with the words
landing in the composer for them to check and send. Browsers offer two ways to
turn speech into text:

- **The Web Speech API** (`SpeechRecognition`) recognises in the browser. It
  doesn't exist in Firefox, its quality differs from one browser to the next,
  and in Chrome the audio goes to Google's servers.
- **Recording** with `MediaRecorder` works in every current browser, and the
  recording can be sent to a model of our choosing.

The site already runs on Cloudflare Workers, which hosts OpenAI's Whisper
(`@cf/openai/whisper-large-v3-turbo`) as a Workers AI model, at $0.0005 per
audio minute (46.63 neurons) with 10,000 neurons a day free
(<https://developers.cloudflare.com/workers-ai/platform/pricing/>). The
model's page doesn't say which audio formats it accepts or whether its
`language` field is a hint
(<https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/>).

## Decision

Julian decided on 2 Nov 2026:

- **The browser records and our Worker transcribes**, with Whisper on
  Workers AI, at `POST /api/transcribe`.
- **The text goes into the composer** and is never sent on its own.
- **Each visitor gets 20 transcriptions a day**, and the site 150 minutes of
  audio, inside the free neurons. Both fail closed, like the chat's limits.

How it's built:

- **The browser sends a 16 kHz mono 16-bit WAV.** It decodes whatever it
  recorded (WebM/Opus in Chrome and Firefox, MP4/AAC in Safari) and resamples
  it itself. So no unconfirmed format is relied on, and the Worker reads the
  exact duration from the header to check it and count the minutes.
- **No `language`.** In Whisper it fixes the language rather than hinting it,
  so an English question asked on `/es` would come out wrong; Whisper detects
  English and Spanish on its own. Passing the page's language is the fallback
  if Spanish questions are misheard.
- **Demo mode follows `BOT_DEMO`**, binding or not: previews and e2e answer a
  fixed sentence without calling Workers AI, but still check the WAV, so a
  preview tries a real browser's recording end to end.

## Alternatives considered

- **The Web Speech API:** no Firefox, uneven quality, and the audio goes to
  Google in Chrome.
- **Sending the browser's own recording (WebM or MP4) to Whisper:** smaller
  uploads (about 120 KB for 30s against about 960 KB of WAV), but relying on
  formats the docs don't confirm, and the Worker couldn't check the duration,
  so the site's minutes would be counted as 30s per question.
- **A third-party transcription API:** another company receiving the audio,
  another key and another bill, when the site's own platform has the model.

## Consequences

- The audio reaches Cloudflare, which already runs the site, and nowhere
  else. Neither it nor its text is stored or logged.
- Visitors wait a second or two after they stop, and grant the microphone.
- A 30s question is up to about 1 MB of upload on a phone.
- The Workers AI binding bills even from a local Worker, so local
  development uses `BOT_DEMO="1"`.
- If Workers AI's free neurons or prices change, `DAILY_AUDIO_SECONDS` in
  `src/lib/voice/limits.ts` is the number to revisit.
