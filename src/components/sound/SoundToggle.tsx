import { t } from "../../lib/i18n/t";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { IconButton } from "../ui/IconButton";
import { useSoundEffects } from "./Sound";

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
          <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </IconButton>
  );
}
