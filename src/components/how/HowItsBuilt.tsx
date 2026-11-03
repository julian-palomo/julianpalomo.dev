import { useId } from "react";
import { QUESTION_TEXT_DAYS } from "../../lib/analytics/events";
import { MAX_VISITOR_MESSAGES_PER_DAY } from "../../lib/bot/limits";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { Cycle } from "./Cycle";
import { Ring } from "./Ring";

const h2 = "font-display text-2xl font-extrabold";
const h3 = "font-display text-lg font-bold";

/**
 * The How it's built page (DESIGN.md section 18), for readers who don't
 * program: what the site does, then two diagrams, how a question is answered
 * and how Julian built it, each with its technical side on the step it
 * explains. The numbers come from the code, so the page stays true if they
 * change.
 */
export function HowItsBuilt() {
  const locale = useLocale();
  const copy = t(locale, "howItsBuilt");
  const whatId = useId();
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

      <Ring headingClass={h2} />
      <Cycle headingClass={h2} />
    </div>
  );
}
