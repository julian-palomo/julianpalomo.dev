import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { useContact } from "./Contact";

/** The CV, the same English PDF on every language's page. Personal content (LICENSE, section 2). */
const CV_PATH = "/cv/Julian-Palomo-CV.pdf";

// Secondary buttons: `border`-outlined pills (DESIGN.md section 4). One is a
// link and one a button, so they share the classes rather than a component.
const pill =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-border px-5 font-display font-bold transition-transform duration-[80ms] hover:border-accent motion-safe:active:scale-[0.97]";

/** "Download CV" and "Contact", under the intro (DESIGN.md section 14). */
export function CvAndContact({ className }: { className: string }) {
  const locale = useLocale();
  const { play } = useSoundEffects();
  const contact = useContact();

  // Everything that happens when the CV is downloaded, in one place.
  function downloadCv() {
    play("cv");
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
