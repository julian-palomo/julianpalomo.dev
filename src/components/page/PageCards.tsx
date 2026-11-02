import { Link } from "@tanstack/react-router";
import { paramFromLocale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { PAGE_TITLE_TRANSITION } from "./transition-names";

const CARDS = [
  { to: "/{-$locale}/projects", page: "projects", title: "projectsTitle", line: "projectsCard" },
  {
    to: "/{-$locale}/how-its-built",
    page: "how-its-built",
    title: "howItsBuiltTitle",
    line: "howItsBuiltCard",
  },
] as const;

/**
 * The inner pages as two cards at the end of the home page (DESIGN.md
 * section 18): places, apart from the row of actions. Each card is one link,
 * the page's name and a line on what's inside, side by side from 640px. The
 * name shares its view-transition name with the page's title tab, so it
 * becomes the title when the card is followed.
 */
export function PageCards({ className }: { className: string }) {
  const locale = useLocale();
  return (
    <nav aria-label={t(locale, "pagesLabel")} className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {CARDS.map((card) => (
        <Link
          key={card.page}
          to={card.to}
          params={{ locale: paramFromLocale(locale) }}
          className="flex min-h-11 flex-col gap-1 rounded-[20px] bg-tint px-5 py-4 hover:ring-2 hover:ring-accent"
        >
          <span className="font-display text-lg font-bold text-accent">
            <span className={`inline-block ${PAGE_TITLE_TRANSITION[card.page]}`}>
              {t(locale, card.title)}
            </span>{" "}
            <span aria-hidden="true">→</span>
          </span>
          <span className="text-[14px] text-muted">{t(locale, card.line)}</span>
        </Link>
      ))}
    </nav>
  );
}
