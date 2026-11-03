import { type Doc, docUrl } from "../../lib/how/docs";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

/**
 * A link to one of the repository's documents on GitHub, by its name, in a
 * new tab (DESIGN.md section 18). The arrow shows it leaves the site; screen
 * readers hear where it goes instead.
 */
export function DocLink({ doc }: { doc: Doc }) {
  const copy = t(useLocale(), "howItsBuilt");
  const name = copy.docNames[doc];
  return (
    // The label, not a hidden span, so the name reads "name, on GitHub…" with no stray space.
    <a
      href={docUrl(doc)}
      aria-label={`${name}${copy.newTab}`}
      target="_blank"
      rel="noopener"
      className="self-start font-medium text-accent underline"
    >
      {name}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
