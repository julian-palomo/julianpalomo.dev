import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { boopOnHover } from "../ui/boop";
import { IconButton } from "../ui/IconButton";
import { useSoundEffects } from "./Sound";

// On hover the speaker's waves pulse outwards once, the inner one first; the
// X of a muted speaker shakes, like "shh".
const onHover = boopOnHover({
  parts: [
    {
      part: "wave",
      spring: springs.hop,
      stagger: 60,
      frame: (value) => ({ transform: `translateX(${2 * value}px)`, opacity: 1 - 0.4 * value }),
    },
    {
      part: "shh",
      spring: springs.shake,
      frame: (value) => ({ transform: `translateX(${1.5 * value}px)` }),
    },
  ],
});

/** Mutes the site's sounds, or turns them back on, and remembers the choice (DESIGN.md section 12). */
export function SoundToggle({ look = "glass" }: { look?: "glass" | "tint" }) {
  const { on, toggle } = useSoundEffects();
  const locale = useLocale();
  const track = useTrack();
  return (
    // `data-silent-press`: pressing it never makes a sound, not even the moo
    // that ends the entrance (Entrance.tsx), since its pointerdown comes
    // before the click that mutes.
    <IconButton
      look={look}
      label={t(locale, on ? "muteSounds" : "turnSoundsOn")}
      onPointerEnter={onHover}
      onClick={() => {
        track({ name: "toy", which: "sound" });
        toggle();
      }}
      data-silent-press=""
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        {on ? (
          <>
            <path data-boop="wave" d="M15.5 9a4.5 4.5 0 0 1 0 6" />
            <path data-boop="wave" d="M18 6.5a8 8 0 0 1 0 11" />
          </>
        ) : (
          <path data-boop="shh" d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </IconButton>
  );
}
