import { createContext, type ReactNode, useContext, useState } from "react";
import { SITE_KEY, TEST_SITE_KEY } from "../../lib/contact/turnstile";
import { ContactDialog } from "./ContactDialog";

type ContactState = {
  /** Opens the contact form. */
  open: () => void;
  /** How many messages went this visit, so the chat's cow can lick its lips at each. */
  sent: number;
};

const ContactContext = createContext<ContactState>({ open: () => {}, sent: 0 });

/** The contact form, for any part of the page that opens it or reacts to it. */
export function useContact(): ContactState {
  return useContext(ContactContext);
}

/**
 * Holds the contact form (DESIGN.md section 14) for the page: the intro's
 * "Contact" and the chat's warm errors open it. `demo` (previews and e2e)
 * renders Turnstile with Cloudflare's test key.
 */
export function ContactProvider({ demo, children }: { demo: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(0);
  return (
    <ContactContext value={{ open: () => setOpen(true), sent }}>
      {children}
      <ContactDialog
        open={open}
        siteKey={demo ? TEST_SITE_KEY : SITE_KEY}
        onClose={() => setOpen(false)}
        onSent={() => setSent((count) => count + 1)}
      />
    </ContactContext>
  );
}
