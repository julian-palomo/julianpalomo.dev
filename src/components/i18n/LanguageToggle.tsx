import { useNavigate } from "@tanstack/react-router";
import { rememberChoice } from "../../lib/cookie";
import { LANG_COOKIE, type Locale, paramFromLocale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { springs } from "../../lib/spring";
import { useTrack } from "../analytics/Analytics";
import { useSoundEffects } from "../sound/Sound";
import { boopOnHover } from "../ui/boop";
import { IconButton } from "../ui/IconButton";
import { useLocale } from "./useLocale";

// On hover the letters flip half over, like an airport board's flap, and back.
const onHover = boopOnHover({
  parts: [
    {
      part: "flap",
      spring: springs.hop,
      frame: (value) => ({ transform: `rotateX(${80 * value}deg)` }),
    },
  ],
});

/**
 * Moves to the same page in the other language, keeping the conversation on
 * the home page, and remembers the choice.
 */
export function LanguageToggle() {
  const locale = useLocale();
  const navigate = useNavigate();
  const other: Locale = locale === "es" ? "en" : "es";
  const { short, label } = t(locale, "switchLanguage");
  const { play } = useSoundEffects();
  const track = useTrack();

  function switchLanguage() {
    play("language");
    track({ name: "toy", which: "language" });
    rememberChoice(LANG_COOKIE, other);
    void navigate({
      to: ".",
      params: (params) => ({ ...params, locale: paramFromLocale(other) }),
      search: true,
    });
  }

  // `lang` is the other language's, which the label is written in.
  return (
    <IconButton
      look="glass"
      label={label}
      lang={other}
      onPointerEnter={onHover}
      onClick={switchLanguage}
    >
      <span data-boop="flap" className="inline-block font-display text-[13px] font-bold">
        {short}
      </span>
    </IconButton>
  );
}
