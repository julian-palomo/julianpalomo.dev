import { expect, type Page, test } from "@playwright/test";
import { DEMO_TRANSCRIPT } from "../../src/lib/voice/api";

// Asking by voice (DESIGN.md section 10), in demo mode: Chromium's fake
// microphone records a tone, the browser turns it into a WAV, and the e2e
// build's /api/transcribe checks the WAV and answers the fixed sentence.

// The fake microphone (playwright.config.ts) still needs the permission granted.
test.use({ permissions: ["microphone"] });

const askByVoice = (page: Page) => page.getByRole("button", { name: "Ask by voice" });
const stopRecording = (page: Page) => page.getByRole("button", { name: "Stop recording" });
const box = (page: Page) => page.getByRole("textbox", { name: "Your question" });

test("a recorded question lands in the composer after what's typed, and isn't sent", async ({
  page,
}) => {
  // Keeps every stream the page opens, to check the microphone goes off.
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.assign(window, { __streams: streams });
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      streams.push(stream);
      return stream;
    };
  });
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await box(page).fill("Hello.");
  await askByVoice(page).click();
  await expect(stopRecording(page)).toBeVisible();
  await expect(page.getByText("Listening…").first()).toBeVisible();
  await page.waitForTimeout(1200);
  await stopRecording(page).click();

  await expect(box(page)).toHaveValue(`Hello. ${DEMO_TRANSCRIPT}`);
  await expect(box(page)).toBeFocused();
  const caret = await box(page).evaluate((element: HTMLTextAreaElement) => element.selectionStart);
  expect(caret).toBe(`Hello. ${DEMO_TRANSCRIPT}`.length);
  // Nothing went to the chat: the question waits in the box.
  expect(posts).toContain("/api/transcribe");
  expect(posts).not.toContain("/api/chat");
  const states = await page.evaluate(() =>
    (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((stream) =>
      stream.getTracks().map((track) => track.readyState),
    ),
  );
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((state) => state === "ended")).toBe(true);
});

test("a refused microphone shows its line and changes nothing else", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  await page.goto("/");
  await box(page).fill("Typed already.");
  await askByVoice(page).click();
  await expect(page.getByTestId("voice-error")).toHaveText(
    "The microphone wasn't allowed. You can type your question instead.",
  );
  await expect(box(page)).toHaveValue("Typed already.");
  await expect(page.getByTestId("chat-announcer")).toHaveText(
    "The microphone wasn't allowed. You can type your question instead.",
  );
  // A keystroke clears the line.
  await box(page).press("End");
  await box(page).pressSequentially("!");
  await expect(page.getByTestId("voice-error")).toHaveCount(0);
});

test("without MediaRecorder there's no microphone button", async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "MediaRecorder");
  });
  await page.goto("/");
  await expect(box(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await expect(askByVoice(page)).toHaveCount(0);
});
