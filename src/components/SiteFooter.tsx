import { t } from "../lib/i18n/t";
import { useLocale } from "./i18n/useLocale";
import { PageLinks } from "./page/PageLinks";

/**
 * Every page's footer: the links to the inner pages (DESIGN.md section 18),
 * and the credit Open-Meteo's CC BY 4.0 terms ask for.
 */
export function SiteFooter({ className }: { className?: string }) {
  const locale = useLocale();
  const credit = t(locale, "weatherCredit");
  return (
    <footer
      className={`flex flex-col gap-3 px-4 pt-10 text-[12.5px] text-muted sm:px-6 ${className ?? ""}`}
    >
      <nav aria-label={t(locale, "pagesLabel")} className="flex flex-wrap gap-x-5 gap-y-2">
        <PageLinks className="font-medium text-accent underline" />
      </nav>
      <p>
        {credit.before}{" "}
        <a href="https://open-meteo.com/" className="font-medium text-accent underline">
          {credit.link}
        </a>
      </p>
    </footer>
  );
}
