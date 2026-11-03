import { useState } from "react";
import { chipLabel, type Source } from "../../lib/bot/citations";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { waitChips, waitLine } from "./chat-view";

/** One sweep of light across the pill's line. Keep in step with chat.css. */
const SWEEP_MS = 1800;
/** Between one chip rising and the next, within one arrival of claims. */
const CHIP_STAGGER_MS = 300;
// The "+N more" chip's key among the claims' ids, which never contain "+".
const MORE = "+more";

type Props = {
  /** The answer's parts so far, empty before it arrives. */
  parts: readonly { type: string; state?: unknown }[];
  /** The claims its tools have found so far. */
  sources: readonly Source[];
  longWait: boolean;
};

/**
 * What the answer is doing before its first word (DESIGN.md section 10): a
 * pill whose line says it, with a light sweeping through its words, and the
 * claims it's reading as chips, at most five and then "+N more". The chips
 * aren't live: the chat announces "Answering…" once, and nothing per chip.
 */
export function WaitStatus({ parts, sources, longWait }: Props) {
  const locale = useLocale();
  const line = waitLine(parts, sources.length, longWait, locale);
  const { shown, more } = waitChips(sources);
  const names = t(locale, "sourceNames");

  // Each sweep starts in phase with one clock, so a pill that remounts, as
  // when the answer's own bubble takes over from the placeholder, carries on
  // where the last one was instead of starting again.
  const [sweepDelay] = useState(() => -(performance.now() % SWEEP_MS));

  // Chips rise one after another within each arrival: claims a second tool
  // call adds rise from when they come, not after the first ones' slots.
  const ids = [...shown.map((source) => source.id), ...(more > 0 ? [MORE] : [])];
  const [delays, setDelays] = useState<Record<string, number>>({});
  const fresh = ids.filter((id) => !(id in delays));
  let known = delays;
  if (fresh.length > 0) {
    known = { ...delays };
    for (const [index, id] of fresh.entries()) known[id] = index * CHIP_STAGGER_MS;
    // Adjusting state while rendering, as React documents for state that
    // depends on a changed value; it settles after one extra render.
    setDelays(known);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="relative w-fit rounded-full bg-background px-3 py-1 text-[12.5px] font-medium whitespace-nowrap text-muted">
        <span className="relative inline-block">
          <span data-testid="wait-line">{line}</span>
          {/* A narrow window with soft edges moves right to left, and the
              brighter copy inside it moves the other way by as much, so its
              letters stay on the real ones and only the band travels. */}
          <span
            aria-hidden="true"
            className="wait-sweep"
            style={{ animationDelay: `${sweepDelay}ms` }}
          >
            <span className="wait-sweep-copy" style={{ animationDelay: `${sweepDelay}ms` }}>
              {line}
            </span>
          </span>
        </span>
      </p>
      {ids.length > 0 && (
        <ul aria-label={t(locale, "waitChipsLabel")} className="flex flex-wrap gap-1.5">
          {shown.map((source) => (
            <li
              key={source.id}
              className="chip-rise flex items-center gap-1 rounded-full border-[1.5px] border-border bg-field px-2.5 py-1 text-[12.5px] font-medium"
              style={{ animationDelay: `${known[source.id] ?? 0}ms` }}
            >
              <CheckIcon />
              {chipLabel(source, names)}
            </li>
          ))}
          {more > 0 && (
            <li
              key={MORE}
              className="chip-rise rounded-full border-[1.5px] border-border bg-field px-2.5 py-1 text-[12.5px] font-medium text-muted"
              style={{ animationDelay: `${known[MORE] ?? 0}ms` }}
            >
              {t(locale, "moreFacts")(more)}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" className="text-accent">
      <path
        d="M2.5 6.5 L5 9 L9.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
