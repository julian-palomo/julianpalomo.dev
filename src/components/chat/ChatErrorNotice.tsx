import { t } from "../../lib/i18n/t";
import { site } from "../../lib/site";
import { useTrack } from "../analytics/Analytics";
import { useContact } from "../contact/Contact";
import { useLocale } from "../i18n/useLocale";
import { textLink } from "../ui/looks";
import { OutsideLink } from "../ui/OutsideLink";
import { chatErrorMessage, revealOnMount } from "./chat-view";

type Props = { error: Error };

// The other ways to reach Julian, in the order the notice lists them.
const WAYS = [
  { name: "LinkedIn", href: site.links.linkedin, to: "linkedin" },
  { name: "GitHub", href: site.links.github, to: "github" },
] as const;

/**
 * Why the last request failed, warmly, and the other ways to reach Julian
 * (DESIGN.md section 10): the contact form first, then LinkedIn and GitHub. It's an alert, so screen readers announce it once
 * when it appears. The cow on the chat's edge lowers its head.
 */
export function ChatErrorNotice({ error }: Props) {
  const locale = useLocale();
  const contact = t(locale, "contact");
  const track = useTrack();
  const { open: openContact } = useContact();
  return (
    <div ref={revealOnMount} className="max-lg:scroll-mb-44">
      <div role="alert" className="flex min-w-0 flex-col gap-1 rounded-[20px] bg-tint px-4 py-3">
        <p>{chatErrorMessage(error, locale)}</p>
        <p className="text-[12.5px] text-muted">
          {contact.before}{" "}
          <button type="button" onClick={openContact} className={textLink}>
            {contact.writeToMe}
          </button>
          {contact.reach}{" "}
          {WAYS.map((way, index) => (
            <span key={way.name}>
              {index > 0 && ` ${contact.between} `}
              <OutsideLink
                href={way.href}
                onClick={() => track({ name: "outbound", to: way.to })}
                className={textLink}
              >
                {way.name}
              </OutsideLink>
            </span>
          ))}
          {contact.after}
        </p>
      </div>
    </div>
  );
}
