import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { paramFromLocale } from "../../lib/i18n/locale";
import { useLocale } from "../i18n/useLocale";

/**
 * A link to the home page's chat in the page's language. The `#ask` hash
 * makes the home page focus the composer, then drop the hash (Chat.tsx).
 */
export function AskTheCow({ className, children }: { className: string; children: ReactNode }) {
  const locale = useLocale();
  return (
    <Link
      to="/{-$locale}"
      params={{ locale: paramFromLocale(locale) }}
      hash="ask"
      className={className}
    >
      {children}
    </Link>
  );
}
