import { useId } from "react";
import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { boopOnHover } from "../ui/boop";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "./Theme";

// The sun and the moon sit on top of each other. With motion, the sun pulls in
// its rays and turns away as the moon turns in, over 0.55s (DESIGN.md section
// 6). With reduced motion they only crossfade, over 0.3s. Transform and
// opacity only.
const layer =
  "absolute inset-0 size-5 transition-opacity duration-300 motion-safe:transition-[opacity,transform] motion-safe:duration-[550ms] motion-safe:ease-in-out";
const rays =
  "origin-center [transform-box:fill-box] motion-safe:transition-transform motion-safe:duration-[550ms] motion-safe:ease-in-out";

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// The gesture's parts sit in groups of their own, inside the ones the theme
// change turns and scales, so a hover never fights a press.
const part = "origin-center [transform-box:fill-box]";

// On hover the sun stretches its rays and turns a little; the moon rocks and
// a small star by it twinkles. Both play; only the one showing is seen.
const onHover = boopOnHover({
  parts: [
    {
      part: "sun",
      spring: springs.boop,
      frame: (value) => ({ transform: `rotate(${20 * value}deg)` }),
    },
    {
      part: "rays",
      spring: springs.hop,
      frame: (value) => ({ transform: `scale(${1 + 0.3 * value})` }),
    },
    {
      part: "moon",
      spring: springs.shake,
      frame: (value) => ({ transform: `rotate(${12 * value}deg)` }),
    },
    {
      part: "twinkle",
      spring: springs.hop,
      frame: (value) => ({
        opacity: Math.max(0, value),
        transform: `scale(${0.4 + 0.6 * value}) rotate(${45 * value}deg)`,
      }),
    },
  ],
});

/** Switches between the light and dark themes, and remembers the choice. */
export function ThemeToggle({ look = "glass" }: { look?: "glass" | "tint" }) {
  const { theme, toggle } = useTheme();
  const { play } = useSoundEffects();
  const track = useTrack();
  const locale = useLocale();
  const maskId = useId();
  const isDark = theme === "dark";

  const label = t(locale, isDark ? "themeToLight" : "themeToDark");
  const sun = isDark ? "opacity-0 motion-safe:scale-50 motion-safe:rotate-90" : "opacity-100";
  const sunRays = isDark ? "motion-safe:scale-0" : "";
  const moon = isDark ? "opacity-100" : "opacity-0 motion-safe:scale-50 motion-safe:-rotate-90";

  return (
    <IconButton
      look={look}
      label={label}
      onPointerEnter={onHover}
      onClick={() => {
        // Only a press clicks: Glasgow's dusk and dawn change the theme in silence.
        play("theme");
        track({ name: "toy", which: "theme" });
        toggle();
      }}
    >
      <span className="relative block size-5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${layer} ${sun}`}
          fill="none"
          stroke="currentColor"
        >
          <g data-boop="sun" className={part}>
            <circle cx="12" cy="12" r="4.5" strokeWidth="2" />
            <g data-boop="rays" className={part}>
              <g className={`${rays} ${sunRays}`} strokeWidth="2" strokeLinecap="round">
                {RAY_ANGLES.map((angle) => (
                  <line
                    key={angle}
                    x1="12"
                    y1="2.5"
                    x2="12"
                    y2="4.5"
                    transform={`rotate(${angle} 12 12)`}
                  />
                ))}
              </g>
            </g>
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${layer} ${moon}`}
          fill="currentColor"
        >
          <mask id={maskId}>
            {/* Mask luminance, not colours on screen: white keeps the disc, black cuts the crescent. */}
            <rect width="24" height="24" fill="white" />
            <circle cx="17" cy="7" r="6.5" fill="black" />
          </mask>
          <g data-boop="moon" className={part}>
            <circle cx="12" cy="12" r="8.5" mask={`url(#${maskId})`} />
          </g>
          {/* The star that twinkles by the moon on hover; unseen at rest. */}
          <path
            data-boop="twinkle"
            className={part}
            opacity="0"
            d="M19.5 1.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"
          />
        </svg>
      </span>
    </IconButton>
  );
}
