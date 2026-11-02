import { getRouteApi, useSearch } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { type PageName, parseRef } from "../../lib/analytics/events";
import { t } from "../../lib/i18n/t";
import { Analytics } from "../analytics/Analytics";
import { useCleanUrl } from "../analytics/useCleanUrl";
import { useLocale } from "../i18n/useLocale";
import { HeroLandscape } from "../landscape/HeroLandscape";
import { useLiveWeather } from "../landscape/useLiveWeather";
import { useSceneOverride } from "../landscape/useSceneOverride";
import { SiteFooter } from "../SiteFooter";
import { SoundProvider } from "../sound/Sound";
import { AskTheCow } from "./AskTheCow";
import { CowPeek } from "./CowPeek";
import { HeroControls } from "./HeroControls";

const rootRoute = getRouteApi("__root__");

type Props = {
  /** Which page this is, for the visit's analytics. */
  page: Exclude<PageName, "home">;
  /** The page's title, its <h1>. */
  title: string;
  children: ReactNode;
};

/**
 * The shell every inner page shares (DESIGN.md section 18): a shorter live
 * landscape with the same row of controls, the title over its lower edge, a
 * centred column with the way back to the chat at its top and the cow
 * peeking over an edge at its end, then the footer. No portrait and no
 * entrance. The visit is read once, on mount, as on the home page.
 */
export function InnerPage({ page, title, children }: Props) {
  const { entrance, track, sound } = rootRoute.useLoaderData();
  const { ref } = useSearch({ strict: false });
  const [visit] = useState(() => ({
    name: "visit" as const,
    page,
    ref: parseRef(ref),
    returning: entrance === "short",
  }));
  useCleanUrl();
  return (
    <Analytics on={track} visit={visit}>
      <SoundProvider initialOn={sound}>
        <Shell title={title}>{children}</Shell>
      </SoundProvider>
    </Analytics>
  );
}

// The title sits on a `background` tab over the hero's lower edge, where the
// portrait sits on the home page: text straight on the landscape can't keep
// AA contrast across every sky and both themes.
const titleTab =
  "relative z-10 -mt-7 inline-block self-start rounded-[20px] bg-background px-4 py-1 font-display text-[34px] leading-tight font-extrabold tracking-[-0.02em] lg:-mt-8 lg:text-[40px]";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const locale = useLocale();
  const { sky } = useSearch({ strict: false });
  const override = useSceneOverride(typeof sky === "string" ? sky : undefined);
  // An override is a fixed scene, so it doesn't wait for the real weather.
  const weather = useLiveWeather(override === null);
  return (
    <div className="pb-12">
      <header>
        <div className="relative h-[140px] overflow-hidden bg-tint lg:h-[200px]">
          <HeroLandscape override={override} weather={weather} />
          <HeroControls override={override} weather={weather} />
        </div>
      </header>
      <main className="mx-auto flex max-w-[680px] flex-col px-4 sm:px-6 lg:px-0">
        <h1 className={titleTab}>{title}</h1>
        <AskTheCow className="mt-4 w-fit text-[14px] font-medium text-accent hover:underline">
          {t(locale, "askTheCow")}
        </AskTheCow>
        <div className="mt-8">{children}</div>
        <CowPeek />
      </main>
      <SiteFooter className="mx-auto max-w-[680px] lg:px-0" />
    </div>
  );
}
