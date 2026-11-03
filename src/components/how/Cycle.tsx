import { useId, useState } from "react";
import {
  ACTOR_PLACES,
  ACTORS,
  type Actor,
  CYCLE_STEPS,
  isLastStep,
  nextStep,
  previousStep,
} from "../../lib/how/cycle";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { IconButton } from "../ui/IconButton";
import { DocLink } from "./DocLink";
import { diagramCard, diagramColumn, diagramSection, stepButton } from "./diagram";

// The drawing's coordinates; the actors sit at ACTOR_PLACES, in percent of these.
const WIDTH = 340;
const HEIGHT = 300;

const place = (actor: Actor) => ({
  x: (ACTOR_PLACES[actor].x / 100) * WIDTH,
  y: (ACTOR_PLACES[actor].y / 100) * HEIGHT,
});

// The lines a change can travel: the diamond's four sides, and Me to GitHub across it.
const EDGES: readonly [Actor, Actor][] = [
  ["me", "claudeCode"],
  ["claudeCode", "github"],
  ["github", "supervisor"],
  ["supervisor", "me"],
  ["me", "github"],
];

type View = "plain" | "developers";

const toggle = (pressed: boolean) =>
  `min-h-10 rounded-[20px] px-2.5 py-1 text-[13px] font-semibold leading-tight transition-colors duration-200 ${pressed ? "bg-accent text-on-accent" : "text-foreground hover:text-accent"}`;

/**
 * How a change goes round, as a cycle of four actors on a diamond (DESIGN.md
 * section 18). The visitor steps through its ten steps: a marching line runs
 * from one actor to the next, a dot moves to the one that receives the
 * change, and a card under it (beside it from `lg`) says what happens, in
 * plain words or for developers. Nothing plays by itself, so the card is a
 * polite live region. Its section holds its own heading, in `headingClass`.
 */
export function Cycle({ headingClass }: { headingClass: string }) {
  const copy = t(useLocale(), "howItsBuilt");
  const cycle = copy.cycle;
  const headingId = useId();
  const cardId = useId();
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("plain");

  // CYCLE_STEPS and the copy's steps have the same length (tests/unit/how-its-built.test.ts), so both are found.
  const step = CYCLE_STEPS[index] ?? CYCLE_STEPS[0];
  const text = cycle.steps[index] ?? { plain: "", technical: "" };
  const stays = step.from === step.to;
  const from = place(step.from);
  const to = place(step.to);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const route = stays
    ? cycle.actors[step.from].name
    : `${cycle.actors[step.from].name} → ${cycle.actors[step.to].name}`;
  const last = isLastStep(index);
  const nextLabel = last ? cycle.again : cycle.next;

  return (
    <section aria-labelledby={headingId} className={diagramSection}>
      <h2 id={headingId} className={`${headingClass} lg:col-span-2`}>
        {copy.howIBuiltIt}
      </h2>
      <div className={diagramColumn}>
        <div className="relative aspect-[340/300] w-full max-w-[340px]">
          <svg aria-hidden="true" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0">
            {EDGES.map(([a, b]) => {
              const start = place(a);
              const end = place(b);
              return (
                <line
                  key={`${a}-${b}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  className="stroke-border"
                  strokeWidth={2}
                />
              );
            })}
            {!stays && (
              // The line starts and ends under the actors' boxes, so its
              // march, one dash and gap at a time, never shows an end.
              <g transform={`translate(${from.x} ${from.y}) rotate(${angle})`}>
                <line
                  key={index}
                  x1={-12}
                  y1={0}
                  x2={length}
                  y2={0}
                  className="how-march stroke-accent"
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                />
              </g>
            )}
            <circle
              r={7}
              className="how-cycle-dot fill-accent"
              style={{ transform: `translate(${to.x}px, ${to.y}px)` }}
            />
          </svg>

          {ACTORS.map((actor) => {
            const receiving = actor === step.to;
            const ring = receiving ? "ring-3 ring-accent ring-offset-2 ring-offset-background" : "";
            const pulse = receiving && stays ? "how-pulse" : "";
            const fill =
              actor === "me"
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-tint text-foreground";
            return (
              <div
                key={actor}
                data-actor={actor}
                style={{ left: `${ACTOR_PLACES[actor].x}%`, top: `${ACTOR_PLACES[actor].y}%` }}
                className="absolute w-[min(6.5rem,31%)] -translate-x-1/2 -translate-y-1/2"
              >
                {actor === "claudeCode" && (
                  <>
                    <span className="absolute inset-0 translate-x-2 -translate-y-1.5 rounded-[14px] border-[1.5px] border-border bg-tint" />
                    <span className="absolute inset-0 translate-x-1 -translate-y-0.75 rounded-[14px] border-[1.5px] border-border bg-tint" />
                  </>
                )}
                <div
                  className={`relative flex flex-col items-center rounded-[14px] border-[1.5px] px-1.5 py-1.5 text-center leading-tight ${fill} ${ring} ${pulse}`}
                >
                  <span className="font-display text-[13px] font-bold">
                    {cycle.actors[actor].name}
                  </span>
                  <span className="text-[11.5px]">{cycle.actors[actor].role}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <IconButton
            look="tint"
            label={cycle.previous}
            aria-disabled={index === 0}
            aria-controls={cardId}
            onClick={() => setIndex(previousStep)}
          >
            <Arrow back />
          </IconButton>
          <button
            type="button"
            aria-controls={cardId}
            onClick={() => setIndex(nextStep)}
            className={stepButton}
          >
            {nextLabel}
            <Arrow />
          </button>
          <span className="text-sm font-semibold text-muted">
            {cycle.position(index + 1, CYCLE_STEPS.length)}
          </span>
        </div>
      </div>

      <div id={cardId} className={diagramCard}>
        <fieldset className="grid grid-cols-2 rounded-[22px] border-[1.5px] border-border bg-field p-0.5">
          <legend className="sr-only">{cycle.views}</legend>
          <button
            type="button"
            aria-pressed={view === "plain"}
            onClick={() => setView("plain")}
            className={toggle(view === "plain")}
          >
            {cycle.plain}
          </button>
          <button
            type="button"
            aria-pressed={view === "developers"}
            onClick={() => setView("developers")}
            className={toggle(view === "developers")}
          >
            {cycle.developers}
          </button>
        </fieldset>
        <div aria-live="polite" className="flex flex-col gap-2">
          <h3 className="font-display text-lg font-bold">{route}</h3>
          {view === "plain" ? (
            <p>{text.plain}</p>
          ) : (
            <>
              <p className="text-[14px] text-muted">{text.technical}</p>
              <DocLink doc={step.doc} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`size-5 ${back ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
