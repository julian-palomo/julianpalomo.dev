import { type Doc, docUrl } from "../../lib/how/docs";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { textLink } from "../ui/looks";
import { OutsideLink } from "../ui/OutsideLink";

/**
 * A link to one of the repository's documents on GitHub, by its name, in a
 * new tab (DESIGN.md section 18). The arrow shows it leaves the site; screen
 * readers hear where it goes instead.
 */
export function DocLink({ doc }: { doc: Doc }) {
  const copy = t(useLocale(), "howItsBuilt");
  return (
    <OutsideLink href={docUrl(doc)} note={copy.newTab} arrow className={`self-start ${textLink}`}>
      {copy.docNames[doc]}
    </OutsideLink>
  );
}
