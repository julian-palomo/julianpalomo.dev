import type { Messages } from "../../lib/i18n/en";

type Project = Messages["projects"][number];

/**
 * One project on the Projects page (DESIGN.md section 18): its name, when
 * and how it was made, the "why" in Julian's own words, the points taken
 * from his confirmed claims, and its links. The chat card's 2px `border` and
 * 20px radius.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article
      aria-labelledby={`project-${project.id}`}
      className="flex flex-col gap-4 rounded-[20px] border-2 border-border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`project-${project.id}`} className="font-display text-2xl font-extrabold">
          {project.name}
        </h2>
        <p className="text-[13px] text-muted">{project.meta}</p>
      </div>
      <p>{project.why}</p>
      <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
        {project.points.map((point) => (
          <li key={point.claim}>{point.text}</li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {project.links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="font-medium text-accent underline">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
