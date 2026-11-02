import { useChat } from "@ai-sdk/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { MAX_MESSAGES } from "../../lib/bot/limits";
import { LICK_MS } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { useTrack } from "../analytics/Analytics";
import { useContact } from "../contact/Contact";
import { useCowState } from "../cow/use-cow-state";
import { useEntrance } from "../entrance/Entrance";
import { useLocale } from "../i18n/useLocale";
import { type AnswerTyping, useSoundEffects } from "../sound/Sound";
import { ChatEdge } from "./ChatEdge";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import {
  answerAsText,
  answerOutcome,
  latestMessages,
  messageText,
  outOfQuestions,
  remainingSuggestions,
  shouldFollow,
  sourceCount,
} from "./chat-view";
import { Greeting } from "./Greeting";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";
import { useReveal } from "./use-reveal";

// Posts to /api/chat, the default endpoint, with the body the transport sends
// by default except that only the latest MAX_MESSAGES messages go, so a long
// conversation never reaches the endpoint's cap. `body` carries the page's
// locale, which send() passes with each message. Module-level so the
// transport isn't rebuilt on every render.
const transport = new DefaultChatTransport<ChatUIMessage>({
  prepareSendMessagesRequest: ({ body, id, messages, trigger, messageId }) => ({
    body: { ...body, id, messages: latestMessages(messages, MAX_MESSAGES), trigger, messageId },
  }),
});

/** The chat with the assistant. */
/** `onStarted` runs when the visitor sends their first question. */
export function Chat({ onStarted }: { onStarted?: () => void }) {
  const locale = useLocale();
  const entrance = useEntrance();
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({ transport });
  const [input, setInput] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAskFromLink(inputRef);
  const requesting = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const latestAnswer = messages.filter((message) => message.role === "assistant").at(-1);
  const latestText = latestAnswer ? messageText(latestAnswer.parts) : "";

  // The latest answer types itself out from what has arrived; with reduced
  // motion, after Stop or after an error, all of it shows at once.
  const instant = stopped || status === "error" || (latestAnswer !== undefined && reducedMotion());
  const reveal = useReveal({
    id: latestAnswer?.id,
    text: latestText,
    streaming: status === "streaming" && last?.role === "assistant",
    instant,
  });
  // Stop stays until the answer has finished typing, so it can show the rest at once.
  const busy = requesting || reveal.revealing;

  // An answer's sounds follow its typing: a soft typing loop from its first
  // word on screen to its last, then a chime, unless it was stopped or
  // failed. Nothing types itself out with reduced motion, so the loop stays
  // silent there. Only the visitor's answers: the entrance's greeting types
  // itself out elsewhere.
  const { play, setAnswerTyping } = useSoundEffects();
  let answerTyping: AnswerTyping = requesting && !reducedMotion() ? "soon" : "idle";
  if (!instant && reveal.revealing && reveal.shown > 0) answerTyping = "now";
  useEffect(() => setAnswerTyping(answerTyping), [answerTyping, setAnswerTyping]);
  const finishedAnswer =
    !reveal.revealing && reveal.shown > 0 && status === "ready" && !stopped
      ? latestAnswer?.id
      : undefined;
  // biome-ignore lint/correctness/useExhaustiveDependencies: each answer plays once, when it ends.
  useEffect(() => {
    if (finishedAnswer) play("answerEnd");
  }, [finishedAnswer]);

  // A message sent through the contact form makes the cow lick its lips once.
  const { sent } = useContact();
  const [cheeredFor, setCheeredFor] = useState(sent);
  const [cheering, setCheering] = useState(false);
  if (sent !== cheeredFor) {
    setCheeredFor(sent);
    setCheering(true);
  }
  useEffect(() => {
    if (!cheering) return;
    const timer = setTimeout(() => setCheering(false), LICK_MS);
    return () => clearTimeout(timer);
  }, [cheering]);

  const cowState = useCowState({
    status,
    answerHasText: reveal.revealing && reveal.shown > 0,
    revealing: reveal.revealing,
    stopped,
    composer: { hasText: input.length > 0, focused: composerFocused },
    entrance: entrance.cow,
    cheering,
  });

  // Sending swaps Send for Stop, a suggestion removes its own button, and
  // stopping removes Stop. Each would leave keyboard focus on the page, so it
  // goes back to the question box instead.
  // The question a suggestion chip sent, and where the chip was: its bubble
  // flies in from there.
  const [flight, setFlight] = useState<{ text: string; from: DOMRect } | null>(null);

  // The analytics: each question when it's sent, and its answer once the
  // request ends (src/lib/analytics/events.ts). `awaiting` is the question
  // whose answer isn't recorded yet.
  const track = useTrack();
  const awaiting = useRef<number | null>(null);

  // A suggestion chip clicks instead of the send pop: both at once would be
  // within 150ms, which plays only the first.
  function send(text: string, from?: DOMRect) {
    play(from ? "suggestion" : "send");
    const nth = messages.filter((message) => message.role === "user").length + 1;
    const suggestion = from ? t(locale, "suggestions").indexOf(text) : -1;
    track({
      name: "question",
      via: from ? "suggestion" : "typed",
      suggestion: suggestion === -1 ? null : suggestion,
      nth,
      text,
    });
    awaiting.current = nth;
    if (messages.length === 0) onStarted?.();
    setFlight(from ? { text, from } : null);
    setStopped(false);
    void sendMessage({ text }, { body: { locale } });
    setInput("");
    inputRef.current?.focus();
  }

  // Recorded when the request ends, not when the answer has typed itself
  // out: Stop during the typing only shows the rest at once. Keyed on
  // `requesting` alone, so the render between send() and the request starting
  // can't record an answer that hasn't come.
  // biome-ignore lint/correctness/useExhaustiveDependencies: records once, when a request ends.
  useEffect(() => {
    const nth = awaiting.current;
    if (requesting || nth === null) return;
    awaiting.current = null;
    const answer = last?.role === "assistant" ? last : undefined;
    const sources = answer
      ? sourceCount(
          messageText(answer.parts),
          answer.parts.find((part) => part.type === "data-sources")?.data.sources ?? [],
        )
      : 0;
    const outcome = answerOutcome({ error: status === "error" ? error : undefined, stopped });
    track({ name: "answer", nth, sources, outcome });
  }, [requesting]);

  // For screen readers: "Answering…" when an answer starts, then the whole
  // answer once, as plain text, when it has finished typing; never piece by
  // piece.
  const [announcement, setAnnouncement] = useState("");
  const [seenStatus, setSeenStatus] = useState(status);
  if (status !== seenStatus) {
    setSeenStatus(status);
    if (status === "submitted") setAnnouncement(t(locale, "answering"));
  }
  const [wasRevealing, setWasRevealing] = useState(false);
  if (reveal.revealing !== wasRevealing) {
    setWasRevealing(reveal.revealing);
    if (!reveal.revealing) {
      setAnnouncement(answerAsText(latestText, [], t(locale, "sourceNames"), ""));
    }
  }

  // Follow the typing only from the end of the chat; a visitor who scrolled
  // up to read gets a "New answer ↓" pill instead. The end of the chat, not
  // of the page: on a phone the footer and the room for the fixed composer
  // sit below it.
  const end = useRef<HTMLDivElement>(null);
  const atBottom = useAtEnd(end);
  const scrollToEnd = () => end.current?.scrollIntoView({ block: "nearest" });
  useEffect(() => {
    if (reveal.shown > 0 && shouldFollow({ atBottom, streaming: reveal.revealing })) {
      end.current?.scrollIntoView({ block: "nearest" });
    }
  }, [reveal.shown, atBottom, reveal.revealing]);
  const showNewAnswer = reveal.revealing && !atBottom;

  const asked = messages.filter((m) => m.role === "user").map((m) => messageText(m.parts));
  const keepAsking =
    !busy && last?.role === "assistant"
      ? remainingSuggestions(t(locale, "suggestions"), asked, 3)
      : [];

  function stopAnswer() {
    setStopped(true);
    if (requesting) void stop();
    inputRef.current?.focus();
  }

  return (
    <div className="enter-chat-all flex flex-col">
      <ChatEdge cowState={cowState} />
      <div className="relative flex flex-col lg:p-6 lg:pt-10">
        {/* The edge the cow rests on: the card's top border from lg, a line on a phone. */}
        <span aria-hidden="true" className={frame} />
        <span aria-hidden="true" className={line} />
        <section aria-label={t(locale, "chatLabel")} className="flex flex-col gap-6 max-lg:mt-6">
          <p aria-live="polite" className="sr-only" data-testid="chat-announcer">
            {announcement}
          </p>
          <Greeting typed={entrance.greetingTyped} />
          {messages.length === 0 && (
            <div className="enter-chat-later" data-suggestions={entrance.suggestions}>
              <Suggestions
                label={t(locale, "suggestionsLabel")}
                questions={t(locale, "suggestions").slice(0, 3)}
                onPick={send}
              />
            </div>
          )}
          {messages.length > 0 && (
            <MessageList
              messages={messages}
              flight={flight}
              typing={reveal.revealing ? { id: latestAnswer?.id, shown: reveal.shown } : undefined}
            />
          )}
          {keepAsking.length > 0 && (
            <Suggestions
              label={t(locale, "keepAsking")}
              heading={t(locale, "keepAsking")}
              questions={keepAsking}
              onPick={send}
            />
          )}
          {showNewAnswer && (
            <button
              type="button"
              onClick={scrollToEnd}
              className="fixed bottom-44 left-1/2 z-20 lg:bottom-6 min-h-11 -translate-x-1/2 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent"
            >
              {t(locale, "newAnswer")}
            </button>
          )}
          {error && <ChatErrorNotice error={error} />}
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            onStop={stopAnswer}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            busy={busy}
            closed={outOfQuestions(error)}
            ref={inputRef}
          />
          {/* The end of the chat, which following keeps in view, clear of the
              composer fixed over a phone's bottom. */}
          <div ref={end} aria-hidden="true" className="-mt-6 h-px max-lg:scroll-mb-44" />
        </section>
      </div>
    </div>
  );
}

const frame =
  "chat-frame pointer-events-none absolute inset-0 rounded-[20px] border-2 border-border max-lg:hidden";
const line = "chat-line block h-[3px] rounded-full bg-border lg:hidden";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Whether `end` is in view, or near it below, kept current on scroll and resize. */
function useAtEnd(end: RefObject<HTMLElement | null>): boolean {
  const [atEnd, setAtEnd] = useState(true);
  useEffect(() => {
    const check = () =>
      setAtEnd((end.current?.getBoundingClientRect().top ?? 0) <= window.innerHeight + 48);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [end]);
  return atEnd;
}

/**
 * "← Ask the cow" on an inner page lands here with `#ask`: the composer takes
 * focus, then the hash goes, so a reload or going back doesn't focus it
 * again. Dropped through the router, like `?ref=` (useCleanUrl), so its own
 * location never brings it back.
 */
function useAskFromLink(input: RefObject<HTMLTextAreaElement | null>) {
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  useEffect(() => {
    if (hash !== "ask") return;
    input.current?.focus();
    void navigate({ to: ".", search: true, replace: true });
  }, [hash, input, navigate]);
}
