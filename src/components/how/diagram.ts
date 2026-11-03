import { card, chip } from "../ui/looks";

/*
 * What the ring and the cycle share (DESIGN.md section 18): the section, with
 * the card under the diagram on a phone and beside it from `lg`; the column
 * that holds the diagram and its controls; the controls' pill buttons; and
 * the card.
 */

export const diagramSection =
  "flex flex-col gap-6 lg:grid lg:grid-cols-[340px_1fr] lg:items-center lg:gap-x-8";

export const diagramColumn = "flex flex-col items-center gap-4";

/** "Pause", "Play the journey" and "Next step". */
export const stepButton = `inline-flex min-h-11 items-center gap-2 ${chip} px-4 text-sm font-semibold hover:border-accent motion-safe:active:scale-[0.97]`;

export const diagramCard = `flex flex-col gap-3 ${card} p-5`;
