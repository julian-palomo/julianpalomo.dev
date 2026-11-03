import { t } from "../../lib/i18n/t";
import { site } from "../../lib/site";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { boopOnHover } from "../ui/boop";
import { OutsideLink } from "../ui/OutsideLink";
import { useContact } from "./Contact";

/** The CV, the same English PDF on every language's page. Personal content (LICENSE, section 2). */
const CV_PATH = "/cv/Julian-Palomo-CV.pdf";

// Secondary buttons: `border`-outlined pills (DESIGN.md section 4). Two are
// links and one a button, so they share the classes rather than a component.
// 16px padding lets the three share a 358px row on a 390px phone; from
// 1024px they're tighter still, so they fit the intro's 300px column.
const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-border px-4 font-display font-bold transition-transform duration-[80ms] hover:border-accent motion-safe:active:scale-[0.97] whitespace-nowrap max-[359px]:w-full lg:gap-1.5 lg:px-3";

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
 * The three actions, "CV", "Contact" and "GitHub" (DESIGN.md section 14):
 * the inner pages are places, and live in their own cards (section 18). The
 * caller places the row and sets its alignment with a `justify-*` class:
 * left under the intro from 1024px, centred under the chat below it. The
 * three share a line from 390px; from 360px GitHub may wrap under the other
 * two; narrower, they stack, all full width. In the intro's 300px column they
 * fit with 12px padding and 6px gaps, and the row never wraps there: a font
 * that renders wider, or Spanish's "Contacto", runs a few pixels into the
 * column gap instead.
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

  // The same press sound as the CV, the pills' click.
  function openGitHub() {
    play("cv");
    track({ name: "outbound", to: "github" });
  }

  return (
    <div
      className={`flex flex-wrap gap-2 max-[359px]:flex-col lg:flex-nowrap lg:gap-1.5 ${className}`}
    >
      {/* Its name says what it does, and holds the "CV" on screen, so voice
          control still finds it by what it shows. */}
      <a
        href={CV_PATH}
        download
        aria-label={t(locale, "downloadCv")}
        onClick={downloadCv}
        onPointerEnter={onCvHover}
        className={pill}
      >
        <SheetIcon />
        {t(locale, "cvPill")}
      </a>
      <button type="button" onClick={contact.open} onPointerEnter={onContactHover} className={pill}>
        <EnvelopeIcon />
        {t(locale, "contactOpen")}
      </button>
      <OutsideLink
        href={site.links.github}
        icon={<GitHubMark />}
        onClick={openGitHub}
        className={pill}
      >
        GitHub
      </OutsideLink>
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

/**
 * GitHub's mark, the Invertocat, from GitHub's own logo files
 * (brand.github.com/foundations/logo), path unchanged. Its guidelines allow
 * it only in black or white, so it's filled with `github-mark`, black in the
 * light theme and white in the dark, never the pill's text colour, and it
 * never moves on its own.
 */
function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 98 96" className="size-4 shrink-0 fill-github-mark">
      <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
    </svg>
  );
}
