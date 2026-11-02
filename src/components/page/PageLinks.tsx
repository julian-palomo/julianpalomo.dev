import { Link } from "@tanstack/react-router";
import { paramFromLocale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

/**
 * The links to the inner pages (DESIGN.md section 18), in the page's
 * language: next to "Download CV" and "Contact" on the home page, and in
 * every page's footer.
 */
export function PageLinks({ className }: { className: string }) {
  const locale = useLocale();
  return (
    <Link
      to="/{-$locale}/projects"
      params={{ locale: paramFromLocale(locale) }}
      className={className}
    >
      {t(locale, "projectsTitle")}
    </Link>
  );
}
