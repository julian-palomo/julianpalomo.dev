/**
 * The looks several components share, as Tailwind class strings (DESIGN.md
 * section 4). Each caller adds its own size, spacing and type.
 */

/** A chip: a pill in `field` outlined in `border`, like the suggestions and the source chips. */
export const chip = "rounded-full border-[1.5px] border-border bg-field";

/** A card: the chat card's 2px `border` and 20px radius. */
export const card = "rounded-[20px] border-2 border-border";

/** A link inside text, in `accent` and underlined. */
export const textLink = "font-medium text-accent underline";
