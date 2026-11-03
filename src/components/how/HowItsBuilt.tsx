import { useId } from "react";
import { QUESTION_TEXT_DAYS } from "../../lib/analytics/events";
import { MAX_VISITOR_MESSAGES_PER_DAY } from "../../lib/bot/limits";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { OutsideLink } from "../ui/OutsideLink";
import { Flow } from "./Flow";

// The repository's files, on GitHub, for the box at the end.
const REPO = "https://github.com/julian-palomo/julianpalomo.dev/blob/main";

const h2 = "font-display text-2xl font-extrabold";
const h3 = "font-display text-lg font-bold";

/**
 * The How it's built page (DESIGN.md section 18), for readers who don't
 * program: what the site does and how Julian built it, in plain words, then
 * a closed box for developers. The numbers come from the code, so the page
 * stays true if they change.
 */
export function HowItsBuilt() {
  const locale = useLocale();
  const copy = t(locale, "howItsBuilt");
  const whatId = useId();
  const howId = useId();
  const diagramId = useId();
  const parts = [
    copy.cow,
    copy.sources,
    copy.exam,
    {
      title: copy.limits.title,
      body: copy.limits.body(MAX_VISITOR_MESSAGES_PER_DAY, QUESTION_TEXT_DAYS),
    },
    copy.valley,
  ];
  const build = copy.buildFlow;
  const answer = copy.answerFlow;

  return (
    <div className="flex flex-col gap-12">
      <p className="text-lg">{copy.lead}</p>

      <section aria-labelledby={whatId} className="flex flex-col gap-6">
        <h2 id={whatId} className={h2}>
          {copy.whatItDoes}
        </h2>
        {parts.map((part) => (
          <div key={part.title} className="flex flex-col gap-2">
            <h3 className={h3}>{part.title}</h3>
            <p>{part.body}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby={howId} className="flex flex-col gap-6">
        <h2 id={howId} className={h2}>
          {copy.howIBuiltIt}
        </h2>
        {/* Decoration: the steps under it carry the meaning, and the hidden
            paragraph says what it shows. */}
        <figure className="flex flex-col">
          <div aria-hidden="true">
            <Flow
              nodes={[
                { label: build.plan },
                { label: build.tasks, stack: true },
                { label: build.sessions, stack: true },
                { label: build.reviewers },
                { label: build.mailbox, dashed: true },
                { label: build.supervisor },
                { label: build.me, accent: true },
              ]}
            />
          </div>
          <figcaption className="sr-only">{copy.flowAlt}</figcaption>
        </figure>
        <ol className="flex flex-col gap-6">
          {copy.steps.map((step) => (
            <li key={step.title} className="flex flex-col gap-2">
              <h3 className={h3}>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The only technical part, closed so a phone's reader never scrolls
          past it. */}
      <details className="group rounded-[20px] border-2 border-border">
        {/* `flex` hides the browser's own triangle, so the chevron shows it
            opens, and turns when it does. */}
        <summary className="flex min-h-11 items-center justify-between gap-3 rounded-[18px] px-5 font-display text-lg font-bold">
          {copy.forDevelopers}
          <svg
            aria-hidden="true"
            data-testid="details-marker"
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-accent group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="flex flex-col gap-5 px-5 pb-5">
          <p className="text-muted">{copy.developersIntro}</p>
          <figure className="flex flex-col gap-3">
            <figcaption id={diagramId} className={h3}>
              {copy.diagramLabel}
            </figcaption>
            <div role="img" aria-labelledby={diagramId}>
              <Flow
                nodes={[
                  { label: answer.question },
                  { label: answer.limits },
                  { label: answer.model, aside: answer.tools },
                  { label: answer.check },
                  { label: answer.answer, accent: true },
                ]}
              />
            </div>
            {/* The diagram's text alternative, visible to everyone. */}
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px]">
              {copy.diagramSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </figure>
          <div className="flex flex-col gap-2">
            <h3 className={h3}>{copy.docsHeading}</h3>
            <ul className="flex flex-col gap-1.5">
              {copy.docs.map((doc) => (
                <li key={doc.path}>
                  <OutsideLink
                    href={`${REPO}/${doc.path}`}
                    className="font-medium text-accent underline"
                  >
                    {doc.label}
                  </OutsideLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
