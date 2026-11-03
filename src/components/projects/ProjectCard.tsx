import type { Messages } from "../../lib/i18n/en";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { type InnerPageName, PageLink } from "../page/PageLinks";
import { card, textLink } from "../ui/looks";
import { OutsideLink } from "../ui/OutsideLink";
import { PROJECT_SHOTS, SHOTS, type ShotName } from "./shots";

/** A project's page on this site, linked before its other links. */
const PROJECT_PAGE_LINKS: Record<string, InnerPageName | undefined> = { site: "howItsBuilt" };

type Project = Messages["projects"][number];

/**
 * One project on the Projects page (DESIGN.md section 18): its name, when
 * and how it was made, the "why" in Julian's own words, the points taken
 * from his confirmed claims, its screenshots and its links. The chat card's
 * 2px `border` and 20px radius.
 */
export function ProjectCard({ project }: { project: Project }) {
  const rows = PROJECT_SHOTS[project.id] ?? [];
  const pageLink = PROJECT_PAGE_LINKS[project.id];
  return (
    <article
      aria-labelledby={`project-${project.id}`}
      className={`flex flex-col gap-4 ${card} p-5 sm:p-6`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`project-${project.id}`} className="font-display text-2xl font-extrabold">
          {project.name}
        </h2>
        <p className="text-[13px] text-muted">{project.meta}</p>
      </div>
      <p>{project.why}</p>
      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.join(" ")} className="flex items-start gap-3">
              {row.map((name) => (
                <Shot key={name} name={name} />
              ))}
            </div>
          ))}
        </div>
      )}
      <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
        {project.points.map((point) => (
          <li key={point.claim}>{point.text}</li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {pageLink && (
          <li>
            <PageLink page={pageLink} className={textLink} />
          </li>
        )}
        {project.links.map((link) => (
          <li key={link.href}>
            <OutsideLink href={link.href} className={textLink}>
              {link.label}
            </OutsideLink>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * One screenshot: AVIF, then WebP, then the PNG, with its size so nothing
 * shifts, lazy, since the cards sit below the fold on a phone. In a row,
 * each grows by its width over its height, so the row's shots share one
 * height whatever their shape.
 */
function Shot({ name }: { name: ShotName }) {
  const locale = useLocale();
  const { width, height, grow } = SHOTS[name];
  const base = `/images/projects/${name}`;
  return (
    <picture className={`min-w-0 basis-0 ${grow}`}>
      <source type="image/avif" srcSet={`${base}.avif`} />
      <source type="image/webp" srcSet={`${base}.webp`} />
      <img
        src={`${base}.png`}
        alt={t(locale, "projectShots")[name]}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full rounded-[12px] border border-border"
      />
    </picture>
  );
}
