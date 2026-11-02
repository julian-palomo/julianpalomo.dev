import { useEffect, useRef, useState } from "react";
import { effects } from "../../lib/scene/effects";
import { glasgowElevation, sceneInstant, skyMix } from "../../lib/scene/moment";
import { playInstant, playSky } from "../../lib/scene/play";
import { defaultSky, type SkyState, withWeather } from "../../lib/scene/sky-state";
import type { LiveWeather } from "../../lib/weather/weather";
import { useNow } from "../clock/Clock";
import { usePlay } from "../play/Play";
import { useSoundEffects } from "../sound/Sound";
import { useTheme } from "../theme/Theme";
import { Landscape } from "./Landscape";
import { Particles } from "./Particles";
import { useValley } from "./use-valley";

// How long the landscape's half of a theme toggle runs (DESIGN.md section 6).
// Keep in step with the glow's animation in src/styles/landscape.css.
const CHOREOGRAPHY_MS = 1700;

// The rain level from which the rain loop plays (DESIGN.md section 12).
const HEAVY_RAIN = 7;

type Choreography = "sunset" | "sunrise" | null;

type Props = {
  /** The sky `?sky=` fixes, which then holds still, or null. */
  override: SkyState | null;
  /** Glasgow's live weather, once it arrives. */
  weather: LiveWeather | null;
};

/** The landscape in the hero, fed by the page's clock, theme and weather. */
export function HeroLandscape({ override, weather }: Props) {
  const now = useNow();
  const { theme, change } = useTheme();

  const { state: play } = usePlay();

  // The visitor's own sky wins, then `?sky=`, then Glasgow's. While playing
  // the theme follows the slider, so no representative moment applies.
  const shown = override ?? withWeather(defaultSky(now), weather);
  const sky = play.status === "playing" ? playSky(play, now) : shown;

  // Heavy rain on screen, live or the visitor's own, plays its very low loop.
  const { setHeavyRain } = useSoundEffects();
  const heavyRain = !sky.snow && sky.rain >= HEAVY_RAIN;
  useEffect(() => setHeavyRain(heavyRain), [heavyRain, setHeavyRain]);
  let at = override ? override.at.getTime() : sceneInstant(now, theme);
  if (play.status === "playing") at = playInstant(play, now);

  // A toggle starts the landscape's sunset or sunrise; the new `change` object
  // is the signal, so a second press restarts it.
  const [choreography, setChoreography] = useState<Choreography>(null);
  const [seenChange, setSeenChange] = useState(change);
  if (change !== seenChange) {
    setSeenChange(change);
    if (change?.kind === "toggle") setChoreography(theme === "dark" ? "sunset" : "sunrise");
  }
  useEffect(() => {
    if (!choreography) return;
    const timer = setTimeout(() => setChoreography(null), CHOREOGRAPHY_MS);
    return () => clearTimeout(timer);
  }, [choreography]);

  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sync = () => setPaused(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const elevation = glasgowElevation(at);
  const fx = effects(sky);
  // The layer takes the pointer where no control sits above it: the controls
  // come later in the hero, so they're on top and keep every click meant for them.
  const layer = useRef<HTMLDivElement>(null);
  const reactions = useValley(layer, { elevation, clouds: fx.clouds, rain: sky.rain });
  return (
    <div ref={layer} className="absolute inset-0">
      <Landscape
        sky={sky}
        at={at}
        choreography={choreography}
        paused={paused}
        reactions={reactions}
      />
      <Particles
        sky={sky}
        effects={fx}
        elevation={elevation}
        landLight={skyMix(elevation).landLight}
        paused={paused}
      />
    </div>
  );
}
