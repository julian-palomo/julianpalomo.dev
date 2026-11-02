# The contact form

How a message from the site's contact form reaches Julian, what is checked on
the way, and what is never kept. The form itself is `DESIGN.md` section 14;
why it uses Cloudflare's own email binding is
[an ADR](adr/2026-11-02-email-routing-for-the-contact-form.md).

## How a message travels

1. **The visitor opens the form.** "Contact" under the intro opens it, and so
   does "write to me" in the chat's warm errors. Only then does the page load
   Cloudflare Turnstile's script, which checks in the background that the
   visitor is a person and hands the form a token.
2. **The browser checks the fields** with the same Zod schema the server uses
   (`src/lib/contact/schema.ts`):
   - a name of up to 100 characters on one line;
   - a valid email address, which becomes the email's Reply-To;
   - a message of 10 to 2,000 characters.
3. **The server function** (`sendContact` in `src/lib/contact/server.ts`)
   validates the input again, then `handleContact`
   (`src/lib/contact/send.ts`) takes these steps:
   1. **Honeypot.** A filled-in hidden field means a bot. It gets the same
      "sent" answer as a person, and nothing else happens.
   2. **Turnstile.** The token goes to Turnstile's siteverify endpoint with
      the `TURNSTILE_SECRET_KEY` secret and the visitor's IP. A rejected
      token, or a siteverify that can't be reached, stops here.
   3. **The daily limit.** Each visitor may send 5 messages a UTC day, counted
      in D1's `contact_messages` table. A visitor is the same anonymous daily
      hash the chat's limits use: a SHA-256 of `VISITOR_SALT`, the day and
      the IP (or its /64), so the IP is never stored.
   4. **Send.** The `send_email` binding (`EMAIL`) sends a plain-text email.
      It comes from `hello@julianpalomo.dev`, goes to the `CONTACT_TO` secret
      and has the visitor's address as Reply-To.
   5. **Count.** Only once the email has gone, so a failed send doesn't use up
      the visitor's day.
4. **The visitor sees the outcome.** On success, "Thanks! Julian will get back
   to you." and the chat's cow moos (when sound is on, `DESIGN.md` section 12)
   and licks its lips. On a failure, a warm message
   says what to do next, and what they wrote stays in the form.

## What is never kept or logged

- The message, the visitor's name and their address are never stored. D1
  holds only the daily count per anonymous hash.
- Nothing logs the message, either address, the IP or the Turnstile token. A
  failed send logs only Cloudflare's error code, such as
  `E_SENDER_NOT_VERIFIED`.
- Julian's address is a secret (`CONTACT_TO`). It's never in the repo, the
  page or a response.

## Secrets and bindings

| Name                   | What                                                                                        | Where                              |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `TURNSTILE_SECRET_KEY` | The Turnstile widget's secret key                                                           | A Worker secret                    |
| `CONTACT_TO`           | Julian's verified Email Routing destination                                                 | A Worker secret                    |
| `VISITOR_SALT`         | The salt in the visitor hash, shared with the chat's limits                                 | A Worker secret                    |
| `EMAIL`                | The `send_email` binding, with no destination fixed, so it can send to any verified address | `wrangler.jsonc`                   |
| `DB`                   | D1, with `migrations/0002_contact_messages.sql` applied                                     | `wrangler.jsonc`                   |
| `CONTACT_DEMO`         | `"1"` turns on demo mode, below                                                             | `previews.vars` and `env.e2e` only |

The widget's site key is public and lives in `src/lib/contact/turnstile.ts`.

Without one of the three secrets, the binding or D1, the form answers "not
working right now" and sends nothing.

## Demo mode: previews and e2e

Preview URLs are public, so they must never email Julian. With `CONTACT_DEMO`
set to `"1"`, the page renders Turnstile with Cloudflare's always-passing test
site key, and the server checks the dummy token with the matching test secret.
A production secret would reject that token. It then answers "sent" without
counting or sending. The flag is set only in `previews.vars` and `env.e2e`.
Never set it at the top level: production would answer every message "sent"
and drop it.

## Production setup

1. **Secrets.** Add `TURNSTILE_SECRET_KEY` and `CONTACT_TO` as Worker secrets.
   `VISITOR_SALT` is already there for the chat.
2. **The migration.** Apply it:
   `wrangler d1 migrations apply julianpalomo-dev --remote`.
3. **The first message.** Send one from production and check two things: it
   arrives, and replying goes to the visitor. If the send fails with
   `E_SENDER_DOMAIN_NOT_AVAILABLE`, onboard `julianpalomo.dev` under Email
   Service in the dashboard. If that asks to change the SPF record, keep its
   existing includes.
