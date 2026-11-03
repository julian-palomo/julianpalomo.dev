import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { textLink } from "../ui/looks";
import { OutsideLink } from "../ui/OutsideLink";
import { PageLinks } from "./PageLinks";

/**
 * Every page's footer: the links to the inner pages (DESIGN.md section 18),
 * and the credit Open-Meteo's CC BY 4.0 terms ask for. The home page has
 * the inner pages as cards instead, so it leaves the links out.
 */
export function SiteFooter({
  className,
  pageLinks = true,
}: {
  className?: string;
  pageLinks?: boolean;
}) {
  const locale = useLocale();
  const credit = t(locale, "weatherCredit");
  return (
    <footer
      className={`flex flex-col gap-3 px-4 pt-10 text-[12.5px] text-muted sm:px-6 ${className ?? ""}`}
    >
      {pageLinks && (
        <nav aria-label={t(locale, "pagesLabel")} className="flex flex-wrap gap-x-5 gap-y-2">
          <PageLinks className={textLink} />
        </nav>
      )}
      <p>
        {credit.before}{" "}
        <OutsideLink href="https://open-meteo.com/" className={textLink}>
          {credit.link}
        </OutsideLink>
      </p>
    </footer>
  );
}
