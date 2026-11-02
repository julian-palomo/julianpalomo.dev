# The contact form emails Julian through Cloudflare's `send_email` binding

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

The CV on the site carries no phone number or email address, because the repo
is public, so visitors who want to write to Julian need a form
(`DESIGN.md` section 14). The message has to reach his inbox from the server,
with the visitor's address as Reply-To. His address must never appear in the
repo or the page.

The site already runs on Cloudflare Workers, and `julianpalomo.dev` is on
Cloudflare. Email Routing is enabled for it, with Julian's address verified as
a destination.

## Decision

The Worker sends the email through a `send_email` binding (`EMAIL` in
`wrangler.jsonc`), with no destination fixed in the config. Cloudflare's docs
say such a binding "can send to any verified destination address in your
account", and that sends to verified destinations are free on every plan,
even when only Email Routing is configured.

The recipient comes from the `CONTACT_TO` secret at send time, so the address
stays out of the repo. The message is built as an object (`from`, `to`,
`replyTo`, `subject`, `text`) with the binding's current `send()` API, so no
MIME library is needed. `docs/contact.md` describes the whole path.

## Alternatives considered

- **A provider such as Resend.** It's a mature API, but it adds a third-party
  account, an API key to keep as a secret, and a dependency. Cloudflare's
  binding does the same job on infrastructure the site already uses. If the
  binding ever can't send from the site's domain, this is the fallback, with
  the key and the address as secrets.
- **A binding with `destination_address` set.** Simpler, but the address
  would then sit in `wrangler.jsonc`, in a public repo.
- **A `mailto:` link.** It needs no server at all, but it puts an address in
  the page, which is exactly what the form exists to avoid.

## Consequences

- No new dependency or account, and no cost for messages to Julian's own
  verified address.
- Cloudflare's docs don't say whether Email Routing alone is enough to send
  from `hello@julianpalomo.dev`, or whether the domain must also be onboarded
  to Email Service. That's only known on the first real send from
  production. If it fails with `E_SENDER_DOMAIN_NOT_AVAILABLE`, Julian
  onboards the domain, with no code change.
- The binding only exists in a deployed Worker. Previews and e2e use demo
  mode, which never sends.
- The binding is typed by hand, like D1's (`docs/tech-debt.md`).
