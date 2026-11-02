import { Link } from "@tanstack/react-router";
import { paramFromLocale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

/** The inner pages, by the name their links use. */
export type InnerPageName = "projects" | "howItsBuilt";

const PAGES = {
  projects: { to: "/{-$locale}/projects", label: "projectsTitle" },
  howItsBuilt: { to: "/{-$locale}/how-its-built", label: "howItsBuiltTitle" },
} as const;

/** A link to one inner page, in the page's language. */
export function PageLink({ page, className }: { page: InnerPageName; className: string }) {
  const locale = useLocale();
  const { to, label } = PAGES[page];
  return (
    <Link to={to} params={{ locale: paramFromLocale(locale) }} className={className}>
      {t(locale, label)}
    </Link>
  );
}

/**
 * The links to every inner page (DESIGN.md section 18): next to "Download
 * CV" and "Contact" on the home page, and in every page's footer.
 */
export function PageLinks({ className }: { className: string }) {
  return (
    <>
      <PageLink page="projects" className={className} />
      <PageLink page="howItsBuilt" className={className} />
    </>
  );
}
