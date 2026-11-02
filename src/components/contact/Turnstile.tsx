import { useEffect, useRef } from "react";
import type { Locale } from "../../lib/i18n/locale";

// Explicit rendering: the script only defines window.turnstile, and the
// widget renders where and when this component says
// (developers.cloudflare.com/turnstile/get-started/client-side-rendering/).
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// The flexible widget is at least 300px wide; a narrower box gets the compact one.
const FLEXIBLE_MIN_PX = 300;

/** The part of Turnstile's API this uses. */
type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  remove(widgetId: string): void;
};

let loading: Promise<TurnstileApi> | undefined;

/** Loads Turnstile's script once, the first time a widget is wanted, never on page load. */
function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const api = turnstileApi();
      if (api) resolve(api);
      else reject(new Error("Turnstile's script loaded without its API"));
    };
    script.onerror = () => {
      // Forgotten, so the next attempt to open the form tries again.
      loading = undefined;
      reject(new Error("Turnstile's script didn't load"));
    };
    document.head.append(script);
  });
  return loading;
}

function turnstileApi(): TurnstileApi | undefined {
  const api: unknown = Reflect.get(window, "turnstile");
  if (typeof api !== "object" || api === null) return undefined;
  const render: unknown = Reflect.get(api, "render");
  const remove: unknown = Reflect.get(api, "remove");
  if (typeof render !== "function" || typeof remove !== "function") return undefined;
  return {
    render: (container, options) => render.call(api, container, options),
    remove: (widgetId) => remove.call(api, widgetId),
  };
}

type Props = {
  siteKey: string;
  locale: Locale;
  theme: "light" | "dark";
  /** A fresh token when the check passes; null when it expires or fails. */
  onToken: (token: string | null) => void;
};

/**
 * Cloudflare Turnstile's check that the visitor is a person. Each mount
 * renders a new widget, and a token is single-use, so the form remounts this
 * after every attempt to get a new one.
 */
export function Turnstile({ siteKey, locale, theme, onToken }: Props) {
  const container = useRef<HTMLDivElement>(null);
  // The widget calls back long after rendering; it always reaches the latest onToken.
  const latestOnToken = useRef(onToken);
  useEffect(() => {
    latestOnToken.current = onToken;
  });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let widgetId: string | undefined;
    let removed = false;
    const unset = () => latestOnToken.current(null);
    loadTurnstile()
      .then((api) => {
        if (removed) return;
        widgetId = api.render(element, {
          sitekey: siteKey,
          language: locale,
          theme,
          size: element.clientWidth < FLEXIBLE_MIN_PX ? "compact" : "flexible",
          callback: (token: unknown) =>
            latestOnToken.current(typeof token === "string" ? token : null),
          "expired-callback": unset,
          "error-callback": unset,
        });
      })
      // Without the script there's no token, and sending says so.
      .catch(unset);
    return () => {
      removed = true;
      const api = turnstileApi();
      if (api && widgetId !== undefined) api.remove(widgetId);
    };
  }, [siteKey, locale, theme]);

  return <div ref={container} className="min-h-[65px] w-full" />;
}
