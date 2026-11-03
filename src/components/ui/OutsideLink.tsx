import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

type Props = {
  href: string;
  /** The link's visible text, which also starts its accessible name. */
  children: string;
  className?: string;
  onClick?: () => void;
};

/**
 * A link to another site, in a new tab (DESIGN.md section 15). Its name is
 * the visible text and then that it opens in a new tab, as a label rather
 * than a hidden span, so the name has no stray space in it. Links within the
 * site stay plain links.
 */
export function OutsideLink({ href, children, className, onClick }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`${children}${t(useLocale(), "opensInNewTab")}`}
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  );
}
