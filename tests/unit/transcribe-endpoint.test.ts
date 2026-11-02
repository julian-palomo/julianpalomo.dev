import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_TRANSCRIPT } from "../../src/lib/voice/api";
import { handleTranscribe, WHISPER_MODEL } from "../../src/lib/voice/endpoint";
import { MAX_AUDIO_BYTES } from "../../src/lib/voice/limits";
import type { TranscribeStore } from "../../src/lib/voice/store";
import { encodeWav, WAV_RATE } from "../../src/lib/voice/wav";

/** A D1 binding the endpoint accepts; tests swap the store built on it for fakeStore(). */
const fakeDb = {
  prepare: () => {
    throw new Error("unit tests use the fake store, never D1");
  },
};

function fakeAi(answer: unknown = { text: " Where did he study? " }) {
  return { run: vi.fn(async (_model: string, _input: Record<string, unknown>) => answer) };
}

function fakeStore(today = { visitorTranscriptions: 0, audioSeconds: 0 }) {
  return {
    readToday: vi.fn(async (_day: string, _visitor: string) => today),
    count: vi.fn(async (_day: string, _visitor: string, _seconds: number) => {}),
  } satisfies TranscribeStore;
}

const wait = vi.fn(async (_ms: number) => {});

function post(body: BodyInit, type = "audio/wav") {
  return new Request("https://julianpalomo.dev/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": type, "CF-Connecting-IP": "203.0.113.7" },
    body,
  });
}

const seconds = (count: number) => encodeWav(new Float32Array(Math.round(WAV_RATE * count)));

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
  wait.mockClear();
});

describe("handleTranscribe", () => {
  it("transcribes a WAV with Whisper and answers its text, trimmed", async () => {
    const ai = fakeAi();
    const store = fakeStore();
    const env = { AI: ai, DB: fakeDb, VISITOR_SALT: "salt" };
    const response = await handleTranscribe(post(seconds(2)), env, { createStore: () => store });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Where did he study?" });
    expect(ai.run).toHaveBeenCalledWith(WHISPER_MODEL, {
      audio: expect.any(String),
      vad_filter: true,
    });
    expect(store.count).toHaveBeenCalledWith(expect.any(String), expect.any(String), 2);
  });

  it("never logs the text it heard", async () => {
    const env = { AI: fakeAi({ wrong: "a secret question" }), DB: fakeDb, VISITOR_SALT: "salt" };
    await handleTranscribe(post(seconds(1)), env, { createStore: () => fakeStore() });
    expect(JSON.stringify(errors.mock.calls)).not.toContain("secret");
  });

  describe("checks the audio", () => {
    const env = { AI: fakeAi(), DB: fakeDb, VISITOR_SALT: "salt" };
    const run = (request: Request) =>
      handleTranscribe(request, env, { createStore: () => fakeStore() });

    it("refuses a body over the byte cap", async () => {
      const response = await run(post(new Uint8Array(MAX_AUDIO_BYTES + 1)));
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "too_large" });
    });

    it("refuses another type, or a body that isn't a 16 kHz mono WAV", async () => {
      expect((await run(post(seconds(1), "audio/webm"))).status).toBe(415);
      expect((await run(post(new Uint8Array(1000)))).status).toBe(415);
    });

    it("refuses more than 30.5 seconds of audio", async () => {
      const response = await run(post(seconds(31)));
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "too_long" });
      expect((await run(post(seconds(30.4)))).status).toBe(200);
    });
  });

  describe("the limits", () => {
    it("stops a visitor at their daily count, without calling the model", async () => {
      const ai = fakeAi();
      const env = { AI: ai, DB: fakeDb, VISITOR_SALT: "salt" };
      const store = fakeStore({ visitorTranscriptions: 20, audioSeconds: 0 });
      const response = await handleTranscribe(post(seconds(1)), env, { createStore: () => store });
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "visitor_limit" });
      expect(ai.run).not.toHaveBeenCalled();
      expect(store.count).not.toHaveBeenCalled();
    });

    it("stops everyone once the site's minutes are spent", async () => {
      const env = { AI: fakeAi(), DB: fakeDb, VISITOR_SALT: "salt" };
      const store = fakeStore({ visitorTranscriptions: 0, audioSeconds: 9000 });
      const response = await handleTranscribe(post(seconds(1)), env, { createStore: () => store });
      expect(await response.json()).toEqual({ error: "daily_limit" });
    });

    it("counts before the call, so a failed call still costs a try", async () => {
      const ai = { run: vi.fn(async () => Promise.reject(new Error("down"))) };
      const store = fakeStore();
      const env = { AI: ai, DB: fakeDb, VISITOR_SALT: "salt" };
      const response = await handleTranscribe(post(seconds(1)), env, { createStore: () => store });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "failed" });
      expect(store.count).toHaveBeenCalledOnce();
    });

    it("fails closed when D1 fails", async () => {
      const ai = fakeAi();
      const broken = {
        readToday: vi.fn(async () => Promise.reject(new Error("D1 down"))),
        count: vi.fn(async () => {}),
      };
      const env = { AI: ai, DB: fakeDb, VISITOR_SALT: "salt" };
      const response = await handleTranscribe(post(seconds(1)), env, { createStore: () => broken });
      expect(response.status).toBe(503);
      expect(ai.run).not.toHaveBeenCalled();
    });

    it("fails closed without D1, the salt or the binding", async () => {
      for (const env of [
        { AI: fakeAi(), VISITOR_SALT: "salt" },
        { AI: fakeAi(), DB: fakeDb },
        { DB: fakeDb, VISITOR_SALT: "salt" },
        { AI: { run: "not a function" }, DB: fakeDb, VISITOR_SALT: "salt" },
      ]) {
        const response = await handleTranscribe(post(seconds(1)), env);
        expect(response.status).toBe(503);
      }
    });
  });

  describe("demo mode", () => {
    it("answers the fixed sentence after a pause, binding or not, and touches neither", async () => {
      const ai = fakeAi();
      const createStore = vi.fn(() => fakeStore());
      for (const env of [
        { BOT_DEMO: "1" },
        { BOT_DEMO: "1", AI: ai, DB: fakeDb, VISITOR_SALT: "salt" },
      ]) {
        const response = await handleTranscribe(post(seconds(1)), env, { createStore, wait });
        expect(await response.json()).toEqual({ text: DEMO_TRANSCRIPT });
      }
      expect(wait).toHaveBeenCalledWith(800);
      expect(ai.run).not.toHaveBeenCalled();
      expect(createStore).not.toHaveBeenCalled();
    });

    it("still checks the WAV, so a preview tries the browser's recording", async () => {
      const env = { BOT_DEMO: "1" };
      expect((await handleTranscribe(post(new Uint8Array(1000)), env, { wait })).status).toBe(415);
      expect((await handleTranscribe(post(seconds(31)), env, { wait })).status).toBe(422);
      expect(wait).not.toHaveBeenCalled();
    });
  });
});
