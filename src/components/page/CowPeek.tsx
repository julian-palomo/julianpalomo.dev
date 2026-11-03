import type { CowState } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { AssistantCow } from "../cow/AssistantCow";
import { CowHooves } from "../cow/CowHooves";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { AskTheCow } from "./AskTheCow";

const phoneSize = "max-lg:h-[79px] max-lg:w-[100px]";

/**
 * The end of an inner page (DESIGN.md section 18): the assistant cow
 * peeking over a short edge, as on the chat's edge, with a link back to the
 * chat. Its motion lives in cow.css, so with reduced motion it's still. It's
 * idle, unless a page gives it something to do: reading on the not-found
 * page, sorry on the error page.
 */
export function CowPeek({ state = "idle" }: { state?: CowState }) {
  const locale = useLocale();
  const { play } = useSoundEffects();
  return (
    <div className="mt-16 flex flex-col">
      <div className="flex items-end gap-3 pl-2">
        <div className="relative z-10 -mb-[17px] shrink-0 lg:-mb-[22px]">
          <div className="edge-lift relative" data-state={state}>
            <AssistantCow
              state={state}
              size={132}
              animated
              drawingClassName={phoneSize}
              onMoo={() => play("moo")}
            />
            <CowHooves className={phoneSize} />
          </div>
        </div>
        <AskTheCow className="pb-2 font-display text-base font-bold text-accent hover:underline">
          {t(locale, "anythingElse")}
        </AskTheCow>
      </div>
      <span aria-hidden="true" className="block h-[3px] rounded-full bg-border" />
    </div>
  );
}
