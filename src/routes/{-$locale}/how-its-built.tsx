import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { HowItsBuilt } from "../../components/how/HowItsBuilt";
import { useLocale } from "../../components/i18n/useLocale";
import { InnerPage } from "../../components/page/InnerPage";
import { localeFromParam } from "../../lib/i18n/locale";
import { redirectToSpanish } from "../../lib/i18n/locale-route";
import { t } from "../../lib/i18n/t";
import { shareHead } from "../../lib/share";

// `/how-its-built` and `/es/how-its-built`, with the home page's language
// rules (DESIGN.md section 5). It renders fully on the server.
export const Route = createFileRoute("/{-$locale}/how-its-built")({
  params: {
    parse: ({ locale }) => (locale === undefined || locale === "es" ? { locale } : false),
  },
  validateSearch: z.object({
    sky: z.string().optional().catch(undefined),
    ref: z.unknown().optional(),
  }),
  beforeLoad: ({ params }) => redirectToSpanish("/{-$locale}/how-its-built", params.locale),
  head: ({ params }) => {
    const locale = localeFromParam(params.locale);
    return shareHead(locale, { path: "how-its-built", title: t(locale, "howItsBuiltTitle") });
  },
  component: HowItsBuiltPage,
});

/** The How it's built page (DESIGN.md section 18). */
function HowItsBuiltPage() {
  const locale = useLocale();
  return (
    <InnerPage page="how_its_built" title={t(locale, "howItsBuiltTitle")}>
      <HowItsBuilt />
    </InnerPage>
  );
}
