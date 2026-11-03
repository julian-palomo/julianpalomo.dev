import { type CSSProperties, type FocusEvent, useEffect, useId, useState } from "react";
import { MAX_MESSAGES, MAX_VISITOR_MESSAGES_PER_DAY, MAX_VISITOR_TEXT } from "../../lib/bot/limits";
import {
  AUTOPLAY_MS,
  advance,
  RING_DOCS,
  RING_ITEMS,
  RING_START,
  RING_STOPS,
  type RingItem,
  type RingState,
  ringPoint,
  selectItem,
  stopAngle,
} from "../../lib/how/ring";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { DocLink } from "./DocLink";

// The drawing's coordinates: a square, with the circle in the middle.
const SIZE = 340;
const CENTRE = SIZE / 2;
const RADIUS = 124;

const point = (angle: number) => ringPoint(angle, RADIUS, CENTRE, CENTRE);
const at = ({ x, y }: { x: number; y: number }): CSSProperties => ({
  left: `${(x / SIZE) * 100}%`,
  top: `${(y / SIZE) * 100}%`,
});

const question = point(stopAngle("question"));
const answer = point(stopAngle("answer"));
const claude = point(stopAngle("claude"));
// The shortcut's pill sits on the chord, halfway along it.
const shortcut = { x: (question.x + answer.x) / 2, y: (question.y + answer.y) / 2 };
// Where the fetch dot turns back: the facts tile's edge, along the spoke.
const fetchTo = {
  x: (CENTRE - claude.x) * 0.6,
  y: (CENTRE - claude.y) * 0.6,
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chip =
  "border-[1.5px] font-semibold leading-tight transition-colors duration-200 motion-safe:active:scale-[0.97]";
const look = (pressed: boolean) =>
  pressed
    ? "border-accent bg-accent text-on-accent"
    : "border-border bg-field text-foreground hover:border-accent";

/**
 * How a question is answered, as a ring (DESIGN.md section 18): five stops
 * clockwise from the top, the confirmed facts in the centre, and the
 * suggested questions' shortcut on a chord. A dot turns round to the current
 * stop, and a card under the ring (beside it from `lg`) says what happens
 * there, with its technical side behind a disclosure. It plays by itself
 * every 2.8s until it's paused or tapped, and holds while the pointer or
 * focus is on it. Its section holds its own heading, in `headingClass`.
 */
export function Ring({ headingClass }: { headingClass: string }) {
  const locale = useLocale();
  const copy = t(locale, "howItsBuilt");
  const ring = copy.ring;
  const headingId = useId();
  const cardId = useId();
  const [state, setState] = useState<RingState>(RING_START);
  // Autoplay starts on the client, never with reduced motion.
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [technical, setTechnical] = useState(false);

  useEffect(() => {
    if (!reducedMotion()) setPlaying(true);
  }, []);

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const running = playing && !hovered && !focused && !hidden;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setState(advance), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const choose = (item: RingItem) => {
    setPlaying(false);
    setState((current) => selectItem(current, item));
  };
  // Focus moving between the ring's own buttons doesn't release the hold.
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  const texts: Record<RingItem, { name: string; plain: string; technical: string }> = {
    question: {
      ...ring.question,
      technical: ring.question.technical(MAX_VISITOR_TEXT, MAX_MESSAGES),
    },
    limits: { ...ring.limits, plain: ring.limits.plain(MAX_VISITOR_MESSAGES_PER_DAY) },
    claude: ring.claude,
    check: ring.check,
    answer: ring.answer,
    facts: ring.facts,
    shortcut: { ...ring.shortcut, plain: ring.shortcut.plain(MAX_VISITOR_MESSAGES_PER_DAY) },
  };
  const fetching = state.selected === "claude";
  // While Claude reads them, the facts' outline turns accent, with or without the glow.
  const factsFetched = fetching ? "border-accent" : "";
  const playLabel = playing ? ring.pause : ring.play;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_1fr] lg:items-center lg:gap-x-8"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <h2 id={headingId} className={`${headingClass} lg:col-span-2`}>
        {copy.howAnswered}
      </h2>
      <div className="flex flex-col items-center gap-4">
        <div className="@container relative aspect-square w-full max-w-[340px]">
          <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              className="stroke-border"
              strokeWidth={2}
            />
            <line
              x1={question.x}
              y1={question.y}
              x2={answer.x}
              y2={answer.y}
              className="stroke-muted"
              strokeWidth={1.5}
            />
            <line
              x1={claude.x}
              y1={claude.y}
              x2={CENTRE}
              y2={CENTRE}
              className="stroke-muted"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            {fetching && (
              <circle
                // Keyed by the dot's turn, so each arrival on Claude fetches again.
                key={state.rotation}
                cx={claude.x}
                cy={claude.y}
                r={4.5}
                className="how-fetch fill-accent"
                style={
                  { "--fetch-x": `${fetchTo.x}px`, "--fetch-y": `${fetchTo.y}px` } as CSSProperties
                }
              />
            )}
            <g
              className="how-ring-dot"
              style={{
                transform: `rotate(${state.rotation}deg)`,
                transformOrigin: `${CENTRE}px ${CENTRE}px`,
              }}
            >
              <circle cx={CENTRE} cy={CENTRE - RADIUS} r={7} className="fill-accent" />
            </g>
          </svg>

          {RING_STOPS.map((stop) => (
            <button
              key={stop}
              type="button"
              aria-pressed={state.selected === stop}
              aria-controls={cardId}
              onClick={() => choose(stop)}
              style={at(point(stopAngle(stop)))}
              className={`absolute flex min-h-11 w-max max-w-[min(6rem,30cqw)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] px-2.5 py-1 text-center text-[clamp(11.5px,3.9cqw,13px)] ${chip} ${look(state.selected === stop)}`}
            >
              {texts[stop].name}
            </button>
          ))}

          <button
            type="button"
            aria-pressed={state.selected === "facts"}
            aria-controls={cardId}
            onClick={() => choose("facts")}
            style={at({ x: CENTRE, y: CENTRE })}
            className={`absolute flex w-[min(5.5rem,27cqw)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-[14px] border-dashed px-2 py-1.5 text-center text-[clamp(11px,3.6cqw,12px)] ${chip} ${look(state.selected === "facts")} ${factsFetched}`}
          >
            {fetching && <span aria-hidden="true" key={state.rotation} className="how-glow" />}
            <BookIcon />
            {texts.facts.name}
          </button>

          <button
            type="button"
            aria-pressed={state.selected === "shortcut"}
            aria-controls={cardId}
            onClick={() => choose("shortcut")}
            style={at(shortcut)}
            className={`absolute flex min-h-7 -translate-x-1/2 -translate-y-1/2 items-center rounded-full px-2.5 text-[clamp(11px,3.5cqw,12px)] ${chip} ${look(state.selected === "shortcut")}`}
          >
            {texts.shortcut.name}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPlaying((current) => !current)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-border bg-field px-4 text-sm font-semibold hover:border-accent motion-safe:active:scale-[0.97]"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playLabel}
        </button>
      </div>

      {/* Every card sits in the same cell, so the tallest sets the height and
          autoplay never moves the page. Only the current one is visible; the
          others are out of the reading order. Not a live region, so autoplay
          doesn't talk over a screen reader. */}
      <div id={cardId} className="grid">
        {RING_ITEMS.map((item) => {
          const current = item === state.selected;
          const technicalId = `${cardId}-${item}`;
          return (
            <div
              key={item}
              className={`col-start-1 row-start-1 flex flex-col gap-3 rounded-[20px] border-2 border-border p-5 ${current ? "how-card-in" : "invisible"}`}
            >
              <h3 className="font-display text-lg font-bold">{texts[item].name}</h3>
              <p>{texts[item].plain}</p>
              <button
                type="button"
                aria-expanded={technical}
                aria-controls={technicalId}
                onClick={() => setTechnical((open) => !open)}
                className="inline-flex min-h-11 items-center gap-2 self-start font-display font-bold text-accent"
              >
                {ring.technical}
                <Chevron open={technical} />
              </button>
              <div id={technicalId} hidden={!technical} className="flex flex-col gap-2">
                <p className="text-[14px] text-muted">{texts[item].technical}</p>
                <DocLink doc={RING_DOCS[item]} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`size-5 shrink-0 motion-safe:transition-transform motion-safe:duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
    </svg>
  );
}
