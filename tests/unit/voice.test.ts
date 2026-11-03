import { describe, expect, it } from "vitest";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";
import { withTranscript } from "../../src/lib/voice/insert";
import {
  checkTranscribeLimits,
  DAILY_AUDIO_SECONDS,
  MAX_RECORDING_MS,
  MAX_TRANSCRIPTIONS_PER_DAY,
  shouldStop,
} from "../../src/lib/voice/limits";
import { encodeWav, readWav, toMono16k, WAV_RATE } from "../../src/lib/voice/wav";

/** A WAV header like encodeWav's, with one field changed. */
function wavWith(change: (view: DataView) => void, seconds = 1): Uint8Array {
  const bytes = encodeWav(new Float32Array(WAV_RATE * seconds));
  change(new DataView(bytes.buffer));
  return bytes;
}

describe("encodeWav and readWav", () => {
  it("reads back the duration of what it wrote", () => {
    expect(readWav(encodeWav(new Float32Array(WAV_RATE * 3)))).toEqual({ seconds: 3 });
    expect(readWav(encodeWav(new Float32Array(WAV_RATE / 2)))).toEqual({ seconds: 0.5 });
  });

  it("clips samples outside −1 to 1 instead of wrapping them", () => {
    const bytes = encodeWav(new Float32Array([2, -2, 0.5]));
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x7fff);
    expect(view.getInt16(48, true)).toBe(Math.trunc(0.5 * 0x7fff));
  });

  it("refuses another rate, more channels, another depth or compressed audio", () => {
    expect(readWav(wavWith((view) => view.setUint32(24, 44_100, true)))).toBeNull();
    expect(readWav(wavWith((view) => view.setUint16(22, 2, true)))).toBeNull();
    expect(readWav(wavWith((view) => view.setUint16(34, 8, true)))).toBeNull();
    expect(readWav(wavWith((view) => view.setUint16(20, 3, true)))).toBeNull();
  });

  it("refuses what isn't a WAV, or is cut off before its data", () => {
    expect(
      readWav(new TextEncoder().encode("not a wav at all, just some text here!!!!!!!!!")),
    ).toBeNull();
    expect(readWav(encodeWav(new Float32Array(10)).subarray(0, 30))).toBeNull();
  });

  it("counts only the data that's there when the header claims more", () => {
    const bytes = wavWith((view) => view.setUint32(40, 10_000_000, true));
    expect(readWav(bytes)).toEqual({ seconds: 1 });
  });
});

describe("toMono16k", () => {
  it("resamples 48 kHz to 16 kHz, a third as many samples", () => {
    expect(toMono16k([new Float32Array(48_000)], 48_000)).toHaveLength(16_000);
  });

  it("averages the channels into one", () => {
    const left = new Float32Array(48).fill(1);
    const right = new Float32Array(48).fill(0);
    const mono = toMono16k([left, right], 48_000);
    expect([...mono].every((sample) => Math.abs(sample - 0.5) < 1e-6)).toBe(true);
  });
});

describe("checkTranscribeLimits", () => {
  it("lets a visitor through until their daily count", () => {
    expect(checkTranscribeLimits({ visitorTranscriptions: 0, audioSeconds: 0 }, 10)).toEqual({
      ok: true,
    });
    expect(
      checkTranscribeLimits(
        { visitorTranscriptions: MAX_TRANSCRIPTIONS_PER_DAY, audioSeconds: 0 },
        1,
      ),
    ).toEqual({ ok: false, limit: "visitor_limit" });
  });

  it("stops everyone once the site's minutes would run over, first", () => {
    const full = {
      visitorTranscriptions: MAX_TRANSCRIPTIONS_PER_DAY,
      audioSeconds: DAILY_AUDIO_SECONDS - 5,
    };
    expect(checkTranscribeLimits(full, 10)).toEqual({ ok: false, limit: "daily_limit" });
    expect(
      checkTranscribeLimits({ visitorTranscriptions: 0, audioSeconds: DAILY_AUDIO_SECONDS - 5 }, 5),
    ).toEqual({ ok: true });
  });
});

describe("shouldStop", () => {
  it("stops the recording at 30 seconds, not before", () => {
    expect(MAX_RECORDING_MS).toBe(30_000);
    expect(shouldStop(29_999)).toBe(false);
    expect(shouldStop(30_000)).toBe(true);
  });
});

describe("withTranscript", () => {
  it("fills an empty composer with the text, the caret at its end", () => {
    expect(withTranscript("", " Where did he study? ")).toEqual({
      value: "Where did he study?",
      caret: 19,
    });
  });

  it("goes after what's typed, with one space between", () => {
    expect(withTranscript("Hi.", "Where did he study?")).toEqual({
      value: "Hi. Where did he study?",
      caret: 23,
    });
    expect(withTranscript("Hi.  \n", "Where?").value).toBe("Hi. Where?");
  });
});

describe("the voice limit's copy", () => {
  it("says the limit from the code, in both languages", () => {
    const limit = String(MAX_TRANSCRIPTIONS_PER_DAY);
    expect(en.voiceErrors.visitorLimit(MAX_TRANSCRIPTIONS_PER_DAY)).toContain(limit);
    expect(es.voiceErrors.visitorLimit(MAX_TRANSCRIPTIONS_PER_DAY)).toContain(limit);
  });
});
