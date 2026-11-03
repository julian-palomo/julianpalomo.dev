/**
 * The cycle on How it's built: how a change goes round four actors, in ten
 * steps the visitor walks through (DESIGN.md section 18). Pure, so it can be
 * unit-tested; `src/components/how/Cycle.tsx` draws it.
 */
import type { Doc } from "./docs";

export const ACTORS = ["me", "claudeCode", "github", "supervisor"] as const;
export type Actor = (typeof ACTORS)[number];

/** Each actor's place on the diamond, in percent of the drawing's width and height. */
export const ACTOR_PLACES: Record<Actor, { x: number; y: number }> = {
  me: { x: 50, y: 14 },
  claudeCode: { x: 77, y: 50 },
  github: { x: 50, y: 86 },
  supervisor: { x: 23, y: 50 },
};

/** One step: who hands the change to whom. `from === to` when it stays with one actor. */
export type CycleStep = { from: Actor; to: Actor; doc: Doc };

export const CYCLE_STEPS = [
  { from: "me", to: "claudeCode", doc: ".claude/skills/implement-issue/SKILL.md" },
  { from: "claudeCode", to: "github", doc: "AGENTS.md#2-workflow" },
  { from: "github", to: "supervisor", doc: "AGENTS.md#2-workflow" },
  { from: "supervisor", to: "github", doc: "AGENTS.md#2-workflow" },
  { from: "github", to: "claudeCode", doc: ".claude/skills/implement-issue/SKILL.md" },
  { from: "claudeCode", to: "claudeCode", doc: ".claude/README.md" },
  { from: "claudeCode", to: "github", doc: ".claude/skills/ship-pr/SKILL.md" },
  { from: "github", to: "supervisor", doc: "docs/evals.md" },
  { from: "supervisor", to: "me", doc: "AGENTS.md#1-hard-constraints" },
  { from: "me", to: "github", doc: "docs/adr/README.md" },
] as const satisfies readonly CycleStep[];

/** The step after `index` (0-based); after the last, the first again. */
export function nextStep(index: number): number {
  return (index + 1) % CYCLE_STEPS.length;
}

/** The step before `index` (0-based); the first has none, so it stays. */
export function previousStep(index: number): number {
  return Math.max(index - 1, 0);
}

/** Whether `index` is the last step, where Next starts again. */
export function isLastStep(index: number): boolean {
  return index === CYCLE_STEPS.length - 1;
}
