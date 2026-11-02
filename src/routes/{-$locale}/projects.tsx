import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useLocale } from "../../components/i18n/useLocale";
import { InnerPage } from "../../components/page/InnerPage";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { localeFromParam } from "../../lib/i18n/locale";
import { redirectToSpanish } from "../../lib/i18n/locale-route";
import { t } from "../../lib/i18n/t";
import { shareHead } from "../../lib/share";

// `/projects` and `/es/projects`: the same slug in both languages, with the
// home page's language rules (DESIGN.md section 5). It renders fully on the
// server: nothing on it is fetched on the client.
export const Route = createFileRoute("/{-$locale}/projects")({
  params: {
    parse: ({ locale }) => (locale === undefined || locale === "es" ? { locale } : false),
  },
  validateSearch: z.object({
    sky: z.string().optional().catch(undefined),
    ref: z.unknown().optional(),
  }),
  beforeLoad: ({ params }) => redirectToSpanish("/{-$locale}/projects", params.locale),
  head: ({ params }) => {
    const locale = localeFromParam(params.locale);
    return shareHead(locale, { path: "projects", title: t(locale, "projectsTitle") });
  },
  component: Projects,
});

/** The Projects page (DESIGN.md section 18): one card per project, Form:at first. */
function Projects() {
  const locale = useLocale();
  return (
    <InnerPage page="projects" title={t(locale, "projectsTitle")}>
      <div className="flex flex-col gap-6">
        {t(locale, "projects").map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </InnerPage>
  );
}
