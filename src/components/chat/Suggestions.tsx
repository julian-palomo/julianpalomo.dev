import { springs } from "../../lib/spring";
import { boopOnHover } from "../ui/boop";
import { chip } from "../ui/looks";

// On hover a question rises 2px and settles back.
const onHover = boopOnHover({
  parts: [
    {
      part: "rise",
      spring: springs.hop,
      frame: (value) => ({ transform: `translateY(${-2 * value}px)` }),
    },
  ],
});

type Props = {
  /** The list's accessible name. */
  label: string;
  /** A visible heading above the questions, such as "Keep asking". */
  heading?: string;
  questions: readonly string[];
  /** `from` is where the chip was on screen, so the bubble can fly in from it. */
  onPick: (question: string, from: DOMRect) => void;
};

/**
 * Questions to start with, or to keep asking, sent as an ordinary message.
 * Centred, wrapped rows too (DESIGN.md section 10).
 */
export function Suggestions({ label, heading, questions, onPick }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {heading && <p className="text-center text-[12.5px] font-semibold text-muted">{heading}</p>}
      <ul aria-label={label} className="flex flex-wrap justify-center gap-2">
        {questions.map((question) => (
          <li key={question}>
            {/* data-suggestion: the chat's cow tilts towards the one under the pointer. */}
            <button
              type="button"
              data-suggestion=""
              data-boop="rise"
              onPointerEnter={onHover}
              onClick={(event) => onPick(question, event.currentTarget.getBoundingClientRect())}
              className={`min-h-11 ${chip} px-4 py-2 text-left text-sm font-medium hover:border-accent`}
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
