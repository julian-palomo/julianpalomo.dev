import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { CowState } from "../../lib/cow-state";
import {
  AFTER_GREETING_MS,
  type Beat,
  beatAt,
  bubbleAt,
  type EntranceKind,
  entranceCowState,
  type Join,
  joinAt,
  nextBeatIn,
  SHORT_MS,
} from "../../lib/entrance";
import { pageRenderedBefore } from "../../lib/page-load";
import { useReveal } from "../chat/use-reveal";
import { useSoundEffects } from "../sound/Sound";

type Stage =
  // The server's HTML and the first client render: the CSS plays on its own.
  | { status: "starting" }
  | { status: "short" }
  | { status: "full"; beat: Beat; bubble: boolean; join: Join; greetingDone: boolean }
  | { status: "over" };

type EntranceView = {
  /** The page's `data-entrance` while the entrance plays; undefined once it's over. */
  playing: EntranceKind | undefined;
  /** What the entrance makes the cow do, or null when the chat leads. */
  cow: CowState | null;
  /** Where the full entrance is, for the cow's flight; null outside it. */
  flight: { beat: Beat; join: Join } | null;
  /** Whether the hero's "Hi! I'm the Highland cow" is up. */
  bubble: boolean;
  /** How much of the greeting is on screen while it types itself out; undefined when it's whole. */
  greetingTyped: number | undefined;
  /** The first suggestions wait for the greeting, then rise; undefined when they simply show. */
  suggestions: "wait" | "rise" | undefined;
  /** The hero, which the cow flies from. */
  hero: RefObject<HTMLElement | null>;
};

const over: EntranceView = {
  playing: undefined,
  cow: null,
  flight: null,
  bubble: false,
  greetingTyped: undefined,
  suggestions: undefined,
  hero: { current: null },
};

const EntranceContext = createContext<EntranceView>(over);

/** The entrance as the page's parts see it; outside the page, it's over. */
export function useEntrance(): EntranceView {
  return useContext(EntranceContext);
}

type Props = {
  kind: EntranceKind;
  /** The greeting's text, which types itself out in the full entrance. */
  greeting: string;
  hero: RefObject<HTMLElement | null>;
  className: string;
  children: ReactNode;
};

const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
// The skips that are a tap, a click or a key: browsers allow sound from them,
// so the cow moos as the entrance ends, unless the press is on a control
// marked `data-silent-press`, such as the mute button.
const MOO_EVENTS = new Set<string>(["pointerdown", "keydown"]);
const mooes = (event: Event) =>
  MOO_EVENTS.has(event.type) &&
  !(event.target instanceof Element && event.target.closest("[data-silent-press]"));

/**
 * The page's entrance (DESIGN.md section 11). It renders the page's root with
 * `data-entrance`, which src/styles/entrance.css times everything from, from
 * the first paint. This half does what CSS can't: it joins the CSS clock at
 * whatever beat it has reached when JavaScript starts, moves the cow and types
 * the greeting, waits for a background tab to be shown, and ends the entrance
 * at once on any tap, key, wheel or touch. It plays only on the page load's
 * first page, never after a client navigation. A tap, click or key also makes the
 * cow moo, the entrance's only sound, since browsers allow none before it.
 * With reduced motion there is none.
 */
export function Entrance({ kind, greeting, hero, className, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // Only the page load's first page plays the entrance: the home page reached
  // later by a client navigation starts at rest. Read once, on mount.
  const [first] = useState(() => !pageRenderedBefore());
  const [stage, setStage] = useState<Stage>(() =>
    first ? { status: "starting" } : { status: "over" },
  );
  const { play } = useSoundEffects();
  const moo = useEffectEvent(() => play("moo"));

  useEffect(() => {
    if (!first) return;
    const element = root.current;
    const clock = element ? cssClock(element) : undefined;
    if (!element || !clock || reducedMotion()) {
      setStage({ status: "over" });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let join: Join | undefined;
    // Once it ends it stays ended: the next beat's timer is cleared, a beat
    // that still fires does nothing, and so does a background tab shown
    // later (`show`). Without these, a tap during the full entrance would end
    // it only until its next beat, which would start it again, cow and all,
    // and the next tap would moo again.
    let ended = false;
    const end = () => {
      ended = true;
      clearTimeout(timer);
      setStage({ status: "over" });
    };
    // The listeners stay after the entrance ends, so only a skip while the
    // root still has `data-entrance` moos.
    const skip = (event: Event) => {
      if (mooes(event) && element.hasAttribute("data-entrance")) moo();
      end();
    };

    const tick = () => {
      if (ended) return;
      const elapsed = typeof clock.currentTime === "number" ? clock.currentTime : 0;
      if (kind === "short") {
        setStage({ status: "short" });
        timer = setTimeout(end, Math.max(0, SHORT_MS - elapsed));
        return;
      }
      const joined = join ?? joinAt(elapsed);
      join = joined;
      setStage((current) => ({
        status: "full",
        beat: beatAt(elapsed),
        bubble: bubbleAt(elapsed),
        join: joined,
        greetingDone:
          current.status === "full" ? current.greetingDone : joined.greeting === "whole",
      }));
      const wait = nextBeatIn(elapsed);
      if (wait !== null) timer = setTimeout(tick, wait);
    };

    // A background tab starts the entrance when it's first shown, from the
    // beginning, unless it has already ended.
    const show = () => {
      if (ended || document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", show);
      restartEntrance(element);
      tick();
    };
    if (document.visibilityState === "visible") tick();
    else document.addEventListener("visibilitychange", show);

    for (const type of SKIP_EVENTS) {
      window.addEventListener(type, skip, { capture: true, passive: true });
    }
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", show);
      for (const type of SKIP_EVENTS) window.removeEventListener(type, skip, { capture: true });
    };
  }, [kind, first]);

  // The greeting types itself out at the answers' pace, from the greeting's beat.
  const full = stage.status === "full" ? stage : null;
  const typing = full !== null && full.join.greeting === "type" && !full.greetingDone;
  const typingNow = typing && full.beat === "greeting";
  // useReveal moves on whenever it's behind its text, even without an id, so
  // it gets the greeting only from the greeting's beat.
  const reveal = useReveal({
    id: typingNow ? "greeting" : undefined,
    text: typingNow ? greeting : "",
    streaming: false,
    instant: false,
  });
  // Adjusting state while rendering: the reveal has reached the greeting's end.
  if (full && typingNow && !reveal.revealing && reveal.shown > 0) {
    setStage({ ...full, greetingDone: true });
  }

  const greetingDone = full?.greetingDone === true;
  useEffect(() => {
    if (!greetingDone) return;
    const timer = setTimeout(() => setStage({ status: "over" }), AFTER_GREETING_MS);
    return () => clearTimeout(timer);
  }, [greetingDone]);

  // Until its beat, none of the greeting shows.
  let typed: number | undefined;
  if (typing) typed = typingNow ? reveal.shown : 0;
  const view = viewOf(stage, kind, typed, hero);
  return (
    <EntranceContext value={view}>
      <div ref={root} data-entrance={view.playing} className={className}>
        {children}
      </div>
    </EntranceContext>
  );
}

function viewOf(
  stage: Stage,
  kind: EntranceKind,
  typed: number | undefined,
  hero: RefObject<HTMLElement | null>,
): EntranceView {
  switch (stage.status) {
    case "starting":
    case "short":
      return { ...over, playing: kind, hero };
    case "over":
      return { ...over, hero };
    case "full": {
      const { beat, bubble, join, greetingDone } = stage;
      return {
        playing: "full",
        cow: greetingDone ? null : entranceCowState(beat),
        flight: { beat, join },
        bubble: bubble && join.cow !== "edge",
        greetingTyped: typed,
        suggestions: greetingDone ? "rise" : "wait",
        hero,
      };
    }
    default: {
      const unhandled: never = stage;
      throw new Error(String(unhandled));
    }
  }
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The CSS animation entrance.css runs on the page's root, whose time is the entrance's. */
function cssClock(root: HTMLElement): CSSAnimation | undefined {
  return root
    .getAnimations()
    .find(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.animationName === "entrance-clock",
    );
}

/** Plays every entrance animation from its start again. */
function restartEntrance(root: HTMLElement): void {
  for (const animation of root.getAnimations({ subtree: true })) {
    if (animation instanceof CSSAnimation && animation.animationName.startsWith("entrance-")) {
      animation.currentTime = 0;
    }
  }
}
