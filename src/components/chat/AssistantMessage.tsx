import { type ReactNode, useId, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { chipLabel, type Source } from "../../lib/bot/citations";
import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { boopOnHover } from "../ui/boop";
import { chip } from "../ui/looks";
import {
  confirmationLine,
  messageText,
  nextSources,
  renderAnswer,
  revealOnMount,
  SOURCES_CLOSED,
  type SourcesEvent,
  sourcesLinkLabel,
  splitIntoChunks,
  type Wait,
} from "./chat-view";
import { WaitStatus } from "./WaitStatus";

// On hover over "Check sources", the answer's citation numbers hop, one after another.
const onSourcesHover = boopOnHover({
  within: "article",
  parts: [
    {
      part: "cite",
      spring: springs.hop,
      stagger: 60,
      frame: (value) => ({ transform: `translateY(${-3 * value}px)` }),
    },
  ],
});

type Props = {
  message: ChatUIMessage;
  /** While the answer types itself out, how much of its text is on screen; undefined once it's done. */
  typed: number | undefined;
  /** Before its first word, and for the fade as that word comes: what it's doing. */
  wait: Wait | undefined;
};

/**
 * One answer (DESIGN.md section 10): its text, typing itself out word by
 * word, each word fading in; citations as numbered buttons; once the last
 * word is on screen, a "Check sources" link. The link
 * shows the numbered source chips, rising in. A number or a chip opens its
 * claim, exactly as Julian confirmed it, under the answer; a number also
 * shows the chips.
 */
export function AssistantMessage({ message, typed, wait }: Props) {
  const locale = useLocale();
  const claimId = useId();
  const listId = useId();
  const names = t(locale, "sourceNames");
  const streaming = typed !== undefined;
  const text = messageText(message.parts);
  const sources = message.parts.find((part) => part.type === "data-sources")?.data.sources ?? [];
  const { parts, chips, length } = renderAnswer(
    streaming ? text.slice(0, typed) : text,
    sources,
    streaming,
  );
  const isDemo = message.metadata?.demo === true;

  // Where the text had got to on each render while it typed itself out. Each
  // new word mounts as its own span and fades in; spans already on screen
  // keep their keys and never animate again.
  const [boundaries, setBoundaries] = useState<number[]>([]);
  if (streaming && length > (boundaries.at(-1) ?? 0)) setBoundaries([...boundaries, length]);
  const chunks = splitIntoChunks(parts, boundaries);
  const fades = boundaries.length > 0;

  const [view, setView] = useState(SOURCES_CLOSED);
  const { play } = useSoundEffects();
  const track = useTrack();
  // Opening the sources clicks; closing them is silent.
  const tap = (event: SourcesEvent) => {
    const next = nextSources(view, event);
    if (next.list && !view.list) {
      play("sources");
      track({ name: "sources_opened" });
    }
    setView(next);
  };
  const open = view.claim;
  const opened = chips.find(({ number }) => number === open);
  const linkLabel = streaming ? undefined : sourcesLinkLabel(chips.length, view.list, locale);
  const showList = linkLabel !== undefined && view.list;
  const labelOf = (number: number) => {
    const chip = chips.find((candidate) => candidate.number === number);
    return chip ? chipLabel(chip.source, names) : "";
  };

  return (
    <article className={answerBubble} aria-label={t(locale, "answerLabel")}>
      {isDemo && (
        <p className="w-fit rounded-full border border-border px-2 text-xs font-semibold text-muted">
          {t(locale, "demo")}
        </p>
      )}
      {wait && (
        <AnswerWait wait={wait}>
          <WaitStatus parts={message.parts} sources={sources} longWait={wait.longWait} />
        </AnswerWait>
      )}
      <p className="whitespace-pre-wrap break-words" data-testid="answer-text">
        {chunks.map((chunk) =>
          chunk.type === "text" ? (
            <span key={chunk.key} className={fades ? "answer-chunk" : undefined}>
              {chunk.text}
            </span>
          ) : (
            <button
              key={chunk.key}
              type="button"
              aria-label={t(locale, "citationLabel")(chunk.number, labelOf(chunk.number))}
              aria-expanded={open === chunk.number}
              aria-controls={claimId}
              onClick={() => tap({ type: "citation", number: chunk.number })}
              className={fades ? "citation answer-chunk" : "citation"}
              data-boop="cite"
            >
              {chunk.number}
            </button>
          ),
        )}
      </p>
      {linkLabel !== undefined && (
        <>
          <button
            type="button"
            aria-expanded={view.list}
            aria-controls={listId}
            onPointerEnter={onSourcesHover}
            onClick={() => tap({ type: "link" })}
            className="min-h-11 w-fit text-left text-[13px] font-medium text-accent hover:underline"
          >
            {linkLabel}
          </button>
          {/* Always there while the link is, so aria-controls names an element; empty, it takes no gap. */}
          <div id={listId} className="empty:hidden">
            {showList && (
              <ol aria-label={t(locale, "sourcesLabel")} className="flex flex-wrap gap-2">
                {chips.map(({ number, source }, index) => (
                  <li
                    key={source.id}
                    className="chip-rise"
                    // One after another, 80ms apart (DESIGN.md section 11).
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <button
                      type="button"
                      aria-expanded={open === number}
                      aria-controls={claimId}
                      onClick={() => tap({ type: "chip", number })}
                      className={`min-h-11 ${chip} px-3 text-left text-[13px] font-medium break-words hover:border-accent`}
                    >
                      {number} · {chipLabel(source, names)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
      {/* Always there, so aria-controls names an element; empty, it takes no gap under the link. */}
      <div id={claimId} className="empty:hidden">
        {opened && <Claim key={opened.number} number={opened.number} source={opened.source} />}
      </div>
    </article>
  );
}

/** A claim opened from its number or chip: its text exactly as confirmed, and when Julian confirmed it. */
function Claim({ number, source }: { number: number; source: Source }) {
  const locale = useLocale();
  return (
    <div
      ref={revealOnMount}
      className="claim-open flex flex-col gap-1 rounded-[14px] border-[1.5px] border-border bg-field p-3 max-lg:scroll-mb-44"
    >
      <p className="text-[12.5px] font-semibold text-accent">
        {number} · {chipLabel(source, t(locale, "sourceNames"))}
      </p>
      <p>{source.text}</p>
      <p className="text-[12.5px] text-muted">{confirmationLine(source, locale)}</p>
    </div>
  );
}

/** An answer's bubble, and the placeholder that stands in for it until the answer arrives. */
export const answerBubble =
  "relative flex w-fit max-w-[92%] min-w-0 flex-col gap-2 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3";

/**
 * Holds the wait's pill and chips. As the first word comes they leave the
 * flow, over the top of the bubble, and fade out on top of the text, so the
 * text starts in its final place. The same element either way, so nothing in
 * it remounts or rises again.
 */
export function AnswerWait({ wait, children }: { wait: Wait; children: ReactNode }) {
  return (
    <div className={wait.leaving ? "wait-leave pointer-events-none absolute inset-x-4 top-3" : ""}>
      {children}
    </div>
  );
}
