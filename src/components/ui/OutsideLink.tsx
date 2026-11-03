import type { ReactNode } from "react";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

type Props = {
  href: string;
  /** The link's visible text, which also starts its accessible name. */
  children: string;
  /** What screen readers hear after the text; by default, that it opens in a new tab. End it with that too. */
  note?: string;
  /** An icon before the text, hidden from screen readers. */
  icon?: ReactNode;
  /** An arrow after the text, hidden from screen readers. */
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * A link to another site, in a new tab (DESIGN.md section 15). Its name is
 * the visible text and then the note, as a label rather than a hidden span,
 * so the name has no stray space in it. Links within the site stay plain
 * links.
 */
export function OutsideLink({
  href,
  children,
  note,
  icon,
  arrow = false,
  className,
  onClick,
}: Props) {
  const locale = useLocale();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`${children}${note ?? t(locale, "opensInNewTab")}`}
      onClick={onClick}
      className={className}
    >
      {icon}
      {children}
      {arrow && <span aria-hidden="true"> ↗</span>}
    </a>
  );
}
