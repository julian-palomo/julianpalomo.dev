import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { InnerPage } from "./InnerPage";

/**
 * What an unknown URL shows, with HTTP status 404 (DESIGN.md section 18): the
 * inner pages' shell, in the language of its path, and the cow at the end
 * reading its notebook, as if it had looked for the page. It records no visit.
 */
export function NotFoundPage() {
  const copy = t(useLocale(), "notFound");
  return (
    <InnerPage title={copy.title} cow="reading">
      <p className="text-lg">{copy.line}</p>
    </InnerPage>
  );
}
