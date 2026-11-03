import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { Button } from "../ui/Button";
import { InnerPage } from "./InnerPage";

/**
 * What an error while rendering a page shows (DESIGN.md section 18): the
 * inner pages' shell, in the language of its path, with the cow at the end
 * sorry, and a way to try again. The error itself is never shown: it may say
 * more than a visitor should read. It records no visit.
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  const copy = t(useLocale(), "pageError");
  const router = useRouter();
  // reset() clears the error boundary; invalidate() runs the page's loaders again.
  const tryAgain = () => {
    reset();
    void router.invalidate();
  };
  return (
    <InnerPage title={copy.title} cow="sorry">
      <div className="flex flex-col gap-6">
        <p className="text-lg">{copy.line}</p>
        <div className="self-start">
          <Button look="primary" onClick={tryAgain}>
            {copy.tryAgain}
          </Button>
        </div>
      </div>
    </InnerPage>
  );
}
