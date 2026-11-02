import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import useSound from "use-sound";
import { rememberChoice } from "../../lib/cookie";
import { SOUND_COOKIE } from "../../lib/sound/cookie";
import { closedGate, type GateState, passGate } from "../../lib/sound/gate";
import {
  HAS_LOOP,
  loopUrls,
  type SoundLoop,
  type SoundMoment,
  SPRITE,
  SPRITE_URLS,
  VOLUMES,
} from "../../lib/sound/moments";

/**
 * What the site uses of a Howler sound. use-sound's types name Howler's
 * `Howl`, whose own types aren't installed; this is the part played here.
 */
type Playable = {
  play: (sprite?: string) => number;
  volume: (volume: number, id?: number) => unknown;
  pause: (id?: number) => unknown;
  stop: (id?: number) => unknown;
  playing: (id?: number) => boolean;
};

/** Where the latest answer is: no answer coming, one on its way, or its text typing itself out. */
export type AnswerTyping = "idle" | "soon" | "now";

type SoundState = {
  on: boolean;
  toggle: () => void;
  /** Plays a moment's sound, if sound is on and the gate lets it through. */
  play: (moment: SoundMoment) => void;
  /** The sky on screen has heavy rain (7 or more): the rain loop plays while it lasts. */
  setHeavyRain: (heavy: boolean) => void;
  /** The typing loop loads once an answer is on its way and plays while its text types itself out. */
  setAnswerTyping: (typing: AnswerTyping) => void;
};

const silent: SoundState = {
  on: false,
  toggle: () => {},
  play: () => {},
  setHeavyRain: () => {},
  setAnswerTyping: () => {},
};

const SoundContext = createContext<SoundState>(silent);

/** The site's sounds; outside the page, everything is silent. */
export function useSoundEffects(): SoundState {
  return useContext(SoundContext);
}

const INTERACTIONS = ["pointerdown", "keydown"] as const;
// The sprite loads once the page is idle, or after this long at the latest.
const IDLE_TIMEOUT_MS = 3000;
// A sound asked for before the sprite has loaded still plays if it loads
// within this long; later, it would no longer answer anything.
const LATE_MS = 1000;

/**
 * The site's sounds (DESIGN.md section 12): on by default, quiet, and off
 * with the toggle, remembered in the `sound` cookie. The sprite loads once
 * the page is idle after hydration, or at the visitor's first tap, click or
 * key if that comes first, never on the critical path, and nothing plays
 * before that first interaction. Each loop loads only the first time it's
 * needed, and stops while the tab is hidden.
 */
export function SoundProvider({
  initialOn,
  children,
}: {
  initialOn: boolean;
  children: ReactNode;
}) {
  const [on, setOn] = useState(initialOn);
  const [interacted, setInteracted] = useState(false);
  const [idle, setIdle] = useState(false);
  const [heavyRain, setHeavyRain] = useState(false);
  const [answerTyping, setAnswerTyping] = useState<AnswerTyping>("idle");
  const [visible, setVisible] = useState(true);
  const gate = useRef<GateState>(closedGate);
  const sprite = useRef<Playable | null>(null);
  const pending = useRef<{ moment: SoundMoment; at: number } | null>(null);

  // A layout effect, so this listener is added before any passive effect's
  // in the page, such as the entrance's: listeners on the same target and
  // phase run in the order they were added, and a sound played from a later
  // one passes the gate. As a passive effect it would run after its
  // children's, and the entrance's moo would find the gate still closed.
  useLayoutEffect(() => {
    const first = () => {
      gate.current = { ...gate.current, interacted: true };
      setInteracted(true);
      setIdle(true);
      for (const type of INTERACTIONS) window.removeEventListener(type, first, { capture: true });
    };
    for (const type of INTERACTIONS) window.addEventListener(type, first, { capture: true });
    return () => {
      for (const type of INTERACTIONS) window.removeEventListener(type, first, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => setIdle(true), { timeout: IDLE_TIMEOUT_MS });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const play = useCallback(
    (moment: SoundMoment) => {
      if (!on || !SPRITE[moment]) return;
      const now = performance.now();
      const result = passGate(gate.current, moment, now);
      gate.current = result.state;
      if (!result.play) return;
      const sound = sprite.current;
      if (sound) sound.volume(VOLUMES[moment], sound.play(moment));
      else pending.current = { moment, at: now };
    },
    [on],
  );

  const spriteLoaded = useCallback((sound: Playable) => {
    sprite.current = sound;
    const late = pending.current;
    pending.current = null;
    if (late && performance.now() - late.at < LATE_MS) {
      sound.volume(VOLUMES[late.moment], sound.play(late.moment));
    }
  }, []);

  const toggle = () => {
    const next = !on;
    rememberChoice(SOUND_COOKIE, next ? "on" : "off");
    if (!next) pending.current = null;
    setOn(next);
  };

  // Each loop's file loads the first time it's wanted, and then plays only
  // while it's heard. The typing loads as soon as an answer is on its way, so
  // it's ready when the first word appears.
  const audible = on && interacted && visible;
  const wanted: Record<SoundLoop, boolean> = {
    rain: HAS_LOOP.rain && on && interacted && heavyRain,
    typing: HAS_LOOP.typing && on && interacted && answerTyping !== "idle",
  };
  const heard: Record<SoundLoop, boolean> = {
    rain: wanted.rain && audible,
    typing: wanted.typing && audible && answerTyping === "now",
  };
  const [loaded, setLoaded] = useState<Record<SoundLoop, boolean>>({ rain: false, typing: false });
  if ((wanted.rain && !loaded.rain) || (wanted.typing && !loaded.typing)) {
    setLoaded({ rain: loaded.rain || wanted.rain, typing: loaded.typing || wanted.typing });
  }

  const hasSprite = Object.keys(SPRITE).length > 0;
  return (
    <SoundContext value={{ on, toggle, play, setHeavyRain, setAnswerTyping }}>
      {children}
      {idle && hasSprite && <SpriteLoader onLoad={spriteLoaded} />}
      {loaded.rain && <Loop loop="rain" playing={heard.rain} />}
      {loaded.typing && <Loop loop="typing" playing={heard.typing} />}
    </SoundContext>
  );
}

/** Loads the sprite with use-sound and hands its sound over once it's ready. */
function SpriteLoader({ onLoad }: { onLoad: (sound: Playable) => void }) {
  const [, { sound }] = useSound(SPRITE_URLS, { sprite: SPRITE });
  useEffect(() => {
    const playable: Playable | null = sound;
    if (playable) onLoad(playable);
  }, [sound, onLoad]);
  return null;
}

/** A loop, very low, playing while `playing` holds and picking up where it paused. */
function Loop({ loop, playing }: { loop: SoundLoop; playing: boolean }) {
  const [, { sound }] = useSound(loopUrls(loop), { loop: true, volume: VOLUMES[loop] });
  useEffect(() => {
    const playable: Playable | null = sound;
    if (!playable) return;
    if (playing && !playable.playing()) playable.play();
    if (!playing) playable.pause();
  }, [sound, playing]);
  useEffect(() => {
    const playable: Playable | null = sound;
    return () => {
      playable?.stop();
    };
  }, [sound]);
  return null;
}
