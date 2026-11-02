import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { boopOnHover } from "../ui/boop";
import { useContact } from "./Contact";

/** The CV, the same English PDF on every language's page. Personal content (LICENSE, section 2). */
const CV_PATH = "/cv/Julian-Palomo-CV.pdf";

// Secondary buttons: `border`-outlined pills (DESIGN.md section 4). One is a
// link and one a button, so they share the classes rather than a component.
const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-border px-5 font-display font-bold transition-transform duration-[80ms] hover:border-accent motion-safe:active:scale-[0.97]";

// On hover the sheet's corner folds out, as if the CV were coming out, and the
// envelope's flap opens a little.
const onCvHover = boopOnHover({
  parts: [
    {
      part: "corner",
      spring: springs.hop,
      frame: (value) => ({ transform: `scale(${1 + 0.6 * value})` }),
    },
  ],
});
const onContactHover = boopOnHover({
  parts: [
    {
      part: "flap",
      spring: springs.hop,
      frame: (value) => ({ transform: `scaleY(${1 - 1.8 * value})` }),
    },
  ],
});

/**
 * "Download CV" and "Contact" (DESIGN.md section 14). The caller places the
 * row and sets its alignment with a `justify-*` class: left under the intro
 * from 1024px, centred above the footer below it.
 */
export function CvAndContact({ className }: { className: string }) {
  const locale = useLocale();
  const { play } = useSoundEffects();
  const contact = useContact();
  const track = useTrack();

  // Everything that happens when the CV is downloaded, in one place.
  function downloadCv() {
    play("cv");
    track({ name: "cv_download" });
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={CV_PATH} download onClick={downloadCv} onPointerEnter={onCvHover} className={pill}>
        <SheetIcon />
        {t(locale, "downloadCv")}
      </a>
      <button type="button" onClick={contact.open} onPointerEnter={onContactHover} className={pill}>
        <EnvelopeIcon />
        {t(locale, "contactOpen")}
      </button>
    </div>
  );
}

// The icons' strokes, 16px like the weather chip's.
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** A sheet with a folded corner; the fold turns about its hinge, the sheet's corner. */
function SheetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" {...stroke}>
      <path d="M3.5 1.5h6l3 3v10h-9z M5.5 8h5M5.5 10.5h5" />
      <path
        data-boop="corner"
        className="origin-[0%_100%] [transform-box:fill-box]"
        d="M9.5 1.5v3h3z"
      />
    </svg>
  );
}

/** An envelope; its flap opens upwards from the top edge. */
function EnvelopeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" {...stroke}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path data-boop="flap" className="origin-top [transform-box:fill-box]" d="M2 4.5 8 9l6-4.5" />
    </svg>
  );
}
