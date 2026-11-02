import { t } from "../../lib/i18n/t";
import { useTrack } from "../analytics/Analytics";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { useContact } from "./Contact";

/** The CV, the same English PDF on every language's page. Personal content (LICENSE, section 2). */
const CV_PATH = "/cv/Julian-Palomo-CV.pdf";

// Secondary buttons: `border`-outlined pills (DESIGN.md section 4). One is a
// link and one a button, so they share the classes rather than a component.
const pill =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-border px-5 font-display font-bold transition-transform duration-[80ms] hover:border-accent motion-safe:active:scale-[0.97]";

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
      <a href={CV_PATH} download onClick={downloadCv} className={pill}>
        {t(locale, "downloadCv")}
      </a>
      <button type="button" onClick={contact.open} className={pill}>
        {t(locale, "contactOpen")}
      </button>
    </div>
  );
}
