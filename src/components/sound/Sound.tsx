import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import useSound from "use-sound";
import { rememberChoice } from "../../lib/cookie";
import { SOUND_COOKIE } from "../../lib/sound/cookie";
import { closedGate, type GateState, passGate } from "../../lib/sound/gate";
import {
  HAS_RAIN,
  RAIN_URLS,
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
  stop: (id?: number) => unknown;
  playing: (id?: number) => boolean;
};

type SoundState = {
  on: boolean;
  toggle: () => void;
  /** Plays a moment's sound, if sound is on and the gate lets it through. */
  play: (moment: SoundMoment) => void;
  /** The sky on screen has heavy rain (7 or more): the rain loop plays while it lasts. */
  setHeavyRain: (heavy: boolean) => void;
};

const silent: SoundState = { on: false, toggle: () => {}, play: () => {}, setHeavyRain: () => {} };

const SoundContext = createContext<SoundState>(silent);

/** The site's sounds; outside the page, everything is silent. */
export function useSoundEffects(): SoundState {
  return useContext(SoundContext);
}

const INTERACTIONS = ["pointerdown", "keydown"] as const;
// The sprite loads once the page is idle, or after this long at the latest.
const IDLE_TIMEOUT_MS = 3000;

/**
 * The site's sounds (DESIGN.md section 12): on by default, quiet, and off
 * with the toggle, remembered in the `sound` cookie. The sprite loads once
 * the page is idle after hydration, never on the critical path, and nothing
 * plays before the visitor's first tap, click or key. The rain loop loads
 * only the first time sound is on, the visitor has interacted and the rain is
 * heavy, and stops while the tab is hidden.
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
  const [visible, setVisible] = useState(true);
  const gate = useRef<GateState>(closedGate);
  const sprite = useRef<Playable | null>(null);

  useEffect(() => {
    const first = () => {
      gate.current = { ...gate.current, interacted: true };
      setInteracted(true);
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
      const sound = sprite.current;
      if (!on || !sound || !SPRITE[moment]) return;
      const result = passGate(gate.current, moment, performance.now());
      gate.current = result.state;
      if (!result.play) return;
      sound.volume(VOLUMES[moment], sound.play(moment));
    },
    [on],
  );

  const toggle = () => {
    const next = !on;
    rememberChoice(SOUND_COOKIE, next ? "on" : "off");
    setOn(next);
  };

  // The rain loop's file loads the first time all of these hold, and then
  // plays only while they do.
  const raining = HAS_RAIN && on && interacted && heavyRain && visible;
  const [rainLoaded, setRainLoaded] = useState(false);
  if (raining && !rainLoaded) setRainLoaded(true);

  const hasSprite = Object.keys(SPRITE).length > 0;
  return (
    <SoundContext value={{ on, toggle, play, setHeavyRain }}>
      {children}
      {idle && hasSprite && (
        <SpriteLoader
          onLoad={(sound) => {
            sprite.current = sound;
          }}
        />
      )}
      {rainLoaded && <RainLoop playing={raining} />}
    </SoundContext>
  );
}

/** Loads the sprite with use-sound and hands its sound over once it's ready. */
function SpriteLoader({ onLoad }: { onLoad: (sound: Playable) => void }) {
  const [, { sound }] = useSound(SPRITE_URLS, { sprite: SPRITE });
  // biome-ignore lint/correctness/useExhaustiveDependencies: onLoad only stores the sound; it runs once the sound exists.
  useEffect(() => {
    const playable: Playable | null = sound;
    if (playable) onLoad(playable);
  }, [sound]);
  return null;
}

/** The heavy rain's very low loop, playing while `playing` holds. */
function RainLoop({ playing }: { playing: boolean }) {
  const [, { sound }] = useSound(RAIN_URLS, { loop: true, volume: VOLUMES.rain });
  useEffect(() => {
    const rain: Playable | null = sound;
    if (!rain) return;
    if (playing && !rain.playing()) rain.play();
    if (!playing) rain.stop();
  }, [sound, playing]);
  useEffect(() => {
    const rain: Playable | null = sound;
    return () => {
      rain?.stop();
    };
  }, [sound]);
  return null;
}
