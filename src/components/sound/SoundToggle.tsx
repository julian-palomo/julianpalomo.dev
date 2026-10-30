import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { IconButton } from "../ui/IconButton";
import { useSoundEffects } from "./Sound";

/** Mutes the site's sounds, or turns them back on, and remembers the choice (DESIGN.md section 12). */
export function SoundToggle({ look = "glass" }: { look?: "glass" | "tint" }) {
  const { on, toggle } = useSoundEffects();
  const locale = useLocale();
  return (
    <IconButton look={look} label={t(locale, on ? "muteSounds" : "turnSoundsOn")} onClick={toggle}>
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
