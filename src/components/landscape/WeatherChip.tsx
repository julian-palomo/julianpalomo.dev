import { glasgow } from "../../lib/glasgow";
import type { Locale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { type ChipWord, chipWord, type LiveWeather } from "../../lib/weather/weather";
import { useNow } from "../clock/Clock";
import { useLocale } from "../i18n/useLocale";
import { boopOnHover } from "../ui/boop";

const pill =
  "inline-flex h-11 items-center rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-transform duration-[80ms] motion-safe:active:scale-[0.97]";
const glass = "bg-glass text-foreground backdrop-blur-[6px]";
const accent = "bg-accent text-on-accent hover:brightness-110";

// On hover the icon moves with the weather: the sun turns, a cloud drifts, the
// drop falls, the snowflake turns, the haar slides. Only the icon showing has its part.
const onHover = boopOnHover({
  parts: [
    {
      part: "sun",
      spring: springs.boop,
      frame: (value) => ({ transform: `rotate(${45 * value}deg)` }),
    },
    {
      part: "cloud",
      spring: springs.hop,
      frame: (value) => ({ transform: `translateX(${2 * value}px)` }),
    },
    {
      part: "drop",
      spring: springs.hop,
      frame: (value) => ({ transform: `translateY(${3 * value}px)`, opacity: 1 - 0.6 * value }),
    },
    {
      part: "flake",
      spring: springs.boop,
      frame: (value) => ({ transform: `rotate(${60 * value}deg)` }),
    },
    {
      part: "haar",
      spring: springs.hop,
      frame: (value) => ({ transform: `translateX(${2 * value}px)` }),
    },
  ],
});

type Props = {
  weather: LiveWeather | null;
  /** The visitor's own sky's hour while they play with it, or null while live. */
  playingHour: number | null;
  /** Opens the gear's panel, from the chip as from the gear. */
  onOpen: (trigger: HTMLElement) => void;
  onBackToLive: () => void;
};

/**
 * Glasgow's time and weather on the landscape, as a button: "Glasgow · 15:04 ·
 * 9°C · Drizzle" from 640px, "9°C · Drizzle" below, "9°C" below 400px so the
 * hero's row of buttons fits a 320px phone, or only the time without
 * weather; pressing it opens the gear's panel. While the visitor plays, it
 * turns accent and reads "Your sky · 15:00 · tap to reset" ("Your sky ·
 * 15:00" below 640px, "15:00" below 400px), and pressing it goes back to
 * live. Its accessible name always says it all.
 */
export function WeatherChip({ weather, playingHour, onOpen, onBackToLive }: Props) {
  const locale = useLocale();
  const now = useNow();

  if (playingHour !== null) {
    const hour = `${String(playingHour).padStart(2, "0")}:00`;
    return (
      <button
        type="button"
        className={`${pill} ${accent}`}
        aria-label={t(locale, "chipPlayingName")(hour)}
        onClick={onBackToLive}
      >
        <span>
          <span className="max-[400px]:hidden">{t(locale, "yourSky")} · </span>
          {hour}
          <span className="hidden sm:inline"> · {t(locale, "tapToReset")}</span>
        </span>
      </button>
    );
  }

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: glasgow.timeZone,
  }).format(now);
  const where = `${t(locale, "glasgow")} · ${time}`;
  const open = (event: { currentTarget: HTMLElement }) => onOpen(event.currentTarget);

  if (!weather) {
    return (
      <button
        type="button"
        className={`${pill} ${glass}`}
        aria-label={t(locale, "chipLiveName")(time)}
        onClick={open}
      >
        <span className="hidden sm:inline">{where}</span>
        <span className="sm:hidden">{time}</span>
      </button>
    );
  }

  const temperature = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "celsius",
    maximumFractionDigits: 0,
  }).format(weather.temperatureC);
  const word = chipWord(weather);
  const label = wordLabel(locale, word);
  const name = t(locale, "chipLiveName")(`${temperature}, ${label.toLocaleLowerCase(locale)}`);

  return (
    <button
      type="button"
      className={`${pill} ${glass}`}
      aria-label={name}
      onClick={open}
      onPointerEnter={onHover}
    >
      <WeatherIcon word={word} />
      {/* One flex item, so the text inside flows inline and keeps its spaces:
          between flex items, white space is dropped. */}
      <span>
        <span className="hidden sm:inline">{where} · </span>
        {temperature}
        <span className="max-[400px]:hidden"> · {label}</span>
      </span>
    </button>
  );
}

function wordLabel(locale: Locale, word: ChipWord): string {
  switch (word.kind) {
    case "snow":
      return t(locale, "weatherSnow");
    case "haar":
      return t(locale, "weatherHaar");
    case "rain":
      return t(locale, "weatherRain")[word.level] ?? "";
    case "clouds":
      return t(locale, "weatherClouds")[word.level] ?? "";
    default: {
      const unhandled: never = word;
      throw new Error(String(unhandled));
    }
  }
}

// Each part turns or slides about its own middle.
const part = "origin-center [transform-box:fill-box]";

/**
 * The weather in a 16px line icon, before the chip's words (DESIGN.md
 * section 7): the sun for a clear sky, the sun behind a cloud for a few or
 * some clouds, a cloud for more, a drop for rain, a snowflake, or three
 * lines of haar. Only from 640px, where the chip names Glasgow and the time:
 * below it the row of buttons has no room to spare (a long Spanish word
 * barely fits at 400px), and phones never hover, so they'd never see it move.
 */
function WeatherIcon({ word }: { word: ChipWord }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mr-1.5 size-4 shrink-0 max-sm:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <WeatherShape word={word} />
    </svg>
  );
}

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function WeatherShape({ word }: { word: ChipWord }) {
  switch (word.kind) {
    case "snow":
      return (
        <path
          data-boop="flake"
          className={part}
          d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6M6.5 2.8 8 4l1.5-1.2M6.5 13.2 8 12l1.5 1.2"
        />
      );
    case "haar":
      return <path data-boop="haar" className={part} d="M2 5h9M5 8h9M2 11h9" />;
    case "rain":
      return (
        <path
          data-boop="drop"
          className={part}
          d="M8 2.5c2.4 3.2 4 5.4 4 7.2a4 4 0 0 1-8 0c0-1.8 1.6-4 4-7.2z"
        />
      );
    case "clouds":
      if (word.level <= 1) {
        return (
          <g data-boop="sun" className={part}>
            <circle cx="8" cy="8" r="2.8" />
            {SUN_RAYS.map((angle) => (
              <path key={angle} d="M8 2v1.4" transform={`rotate(${angle} 8 8)`} />
            ))}
          </g>
        );
      }
      if (word.level <= 4) {
        return (
          <>
            <circle cx="6" cy="6" r="2.4" />
            <path d="M6 1.6v.8M1.6 6h.8M2.9 2.9l.6.6M9.1 2.9l-.6.6" />
            <path
              data-boop="cloud"
              className={part}
              d="M6 14h5.5a2.5 2.5 0 0 0 .3-5 3.4 3.4 0 0 0-6.4 1A2 2 0 0 0 6 14z"
            />
          </>
        );
      }
      return (
        <path
          data-boop="cloud"
          className={part}
          d="M4.5 13h7a3 3 0 0 0 .4-6 4 4 0 0 0-7.6 1.2A2.4 2.4 0 0 0 4.5 13z"
        />
      );
    default: {
      const unhandled: never = word;
      throw new Error(String(unhandled));
    }
  }
}
