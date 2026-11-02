import { useState } from "react";
import { defaultSky, type SkyState, withWeather } from "../../lib/scene/sky-state";
import type { LiveWeather } from "../../lib/weather/weather";
import { useTrack } from "../analytics/Analytics";
import { useNow } from "../clock/Clock";
import { LanguageToggle } from "../i18n/LanguageToggle";
import { WeatherChip } from "../landscape/WeatherChip";
import { Gear } from "../play/Gear";
import { usePlay } from "../play/Play";
import { SkyPanel } from "../play/SkyPanel";
import { SoundToggle } from "../sound/SoundToggle";
import { useTheme } from "../theme/Theme";
import { ThemeToggle } from "../theme/ThemeToggle";

type PanelState = { open: boolean; position: { top: number; left: number } | null };

type Props = {
  /** The landscape `?sky=` fixes, or null for Glasgow's. */
  override: SkyState | null;
  weather: LiveWeather | null;
};

/**
 * The row of controls along the top of every page's hero (DESIGN.md section
 * 5): the gear and the weather chip on the left, language, sound and theme on
 * the right, and the sky panel they open. The `enter-control` classes time
 * each one's pop-in during the home page's entrance and do nothing elsewhere.
 */
export function HeroControls({ override, weather }: Props) {
  const track = useTrack();
  const now = useNow();
  const { state: play } = usePlay();
  const { backToLive } = useTheme();
  const [panel, setPanel] = useState<PanelState>({ open: false, position: null });

  // The gear and the chip open the panel, and the popover sits under
  // whichever was pressed. Opening changes nothing: the first change in the
  // panel starts playing, from the live sky on screen.
  function openPanel(trigger: HTMLElement) {
    const { bottom, left } = trigger.getBoundingClientRect();
    setPanel({ open: true, position: { top: bottom + 8, left } });
  }

  return (
    <>
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Gear onOpen={openPanel} />
          <div className="enter-control enter-control-1">
            <WeatherChip
              weather={weather}
              playingHour={play.status === "playing" ? play.hour : null}
              onOpen={openPanel}
              onBackToLive={() => {
                track({ name: "toy", which: "back_to_live" });
                backToLive();
              }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="enter-control enter-control-2">
            <LanguageToggle />
          </div>
          <div className="enter-control enter-control-3">
            <SoundToggle />
          </div>
          <div className="enter-control enter-control-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
      <SkyPanel
        open={panel.open}
        position={panel.position}
        live={override ?? withWeather(defaultSky(now), weather)}
        onClose={() => setPanel((current) => ({ ...current, open: false }))}
      />
    </>
  );
}
