/**
 * The contact form's server logic (docs/contact.md): checks the visitor is a
 * person with Turnstile, keeps each visitor to CONTACT_DAILY_LIMIT messages a
 * day, and emails the message to Julian with the visitor's address as
 * Reply-To. The message is never stored, and never logged: neither is the
 * visitor's address, their IP or Julian's. src/lib/contact/server.ts passes
 * in the input, the environment and the request's IP, so this module is
 * tested with a mocked fetch, an in-memory store and a fake sender.
 */
import { z } from "zod";
import { type D1Like, isD1, utcDay, visitorHash } from "../bot/usage";
import type { ContactInput, ContactResult } from "./schema";
import { CONTACT_DAILY_LIMIT, type ContactStore, d1ContactStore } from "./store";
import { TEST_SECRET, verifyTurnstile } from "./turnstile";

/** The address messages come from, on the site's own domain. */
export const CONTACT_FROM = "hello@julianpalomo.dev";

/** The email the binding sends: the shape of Cloudflare's `send_email` `send()` that this uses. */
export type ContactEmail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
};

/**
 * The part of the `send_email` binding this module uses. Written by hand, like
 * D1's (docs/tech-debt.md); a failed send throws an Error with a `code`.
 */
type SendEmailLike = { send(message: ContactEmail): Promise<unknown> };

function isSendEmail(value: unknown): value is SendEmailLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "send" in value &&
    typeof value.send === "function"
  );
}

// A missing, empty or malformed value reads as unset, never as an error.
const envSchema = z.object({
  // Set only for previews and e2e (wrangler.jsonc), never at the top level.
  CONTACT_DEMO: z.string().optional().catch(undefined),
  CONTACT_TO: z.email().optional().catch(undefined),
  TURNSTILE_SECRET_KEY: z.string().trim().min(1).optional().catch(undefined),
  VISITOR_SALT: z.string().trim().min(1).optional().catch(undefined),
  DB: z.unknown().optional(),
  EMAIL: z.unknown().optional(),
});

export type ContactDeps = {
  fetch: typeof fetch;
  now: () => Date;
  createStore: (db: D1Like) => ContactStore;
};

const defaultDeps: ContactDeps = {
  fetch: (input, init) => fetch(input, init),
  now: () => new Date(),
  createStore: d1ContactStore,
};

/**
 * Sends one validated message, or says why it didn't go. With CONTACT_DEMO
 * set to "1" (previews and e2e) it checks Turnstile with Cloudflare's test
 * secret and answers as if it sent, without counting or sending, so only
 * production ever emails Julian.
 */
export async function handleContact(
  input: ContactInput,
  rawEnv: unknown,
  ip: string | undefined,
  deps: ContactDeps = defaultDeps,
): Promise<ContactResult> {
  // A bot filled in the hidden field: it gets the same answer as a person,
  // so it learns nothing, and nothing is checked, counted or sent.
  if (input.website !== "") return { status: "sent" };

  const env = envSchema.parse(rawEnv ?? {});
  if (env.CONTACT_DEMO === "1") {
    const verdict = await verifyTurnstile(input.token, ip, TEST_SECRET, deps.fetch);
    return verdict === "ok" ? { status: "sent" } : { status: "error", code: "verification" };
  }

  const { CONTACT_TO: to, TURNSTILE_SECRET_KEY: secret, VISITOR_SALT: salt, DB, EMAIL } = env;
  if (!to || !secret || !salt || !isD1(DB) || !isSendEmail(EMAIL)) {
    return { status: "error", code: "unavailable" };
  }

  const verdict = await verifyTurnstile(input.token, ip, secret, deps.fetch);
  if (verdict !== "ok") return { status: "error", code: "verification" };

  const store = deps.createStore(DB);
  const day = utcDay(deps.now());
  const visitor = await visitorHash(ip ?? "local", day, salt);
  if ((await store.sentToday(day, visitor)) >= CONTACT_DAILY_LIMIT) {
    return { status: "error", code: "limit" };
  }

  try {
    await EMAIL.send(contactEmail(input, to));
  } catch (error) {
    // Only the error's code: the message and both addresses stay out of the logs.
    console.error("Contact email not sent:", errorCode(error));
    return { status: "error", code: "send" };
  }

  // Counted only once the email has gone, so a failed send doesn't use up the
  // visitor's day. A failed count doesn't undo a sent message.
  try {
    await store.countSent(day, visitor);
  } catch (error) {
    console.error("Contact message not counted:", errorCode(error));
  }
  return { status: "sent" };
}

/** The email Julian receives: the message, who wrote it, and Reply-To set to them. */
function contactEmail(input: ContactInput, to: string): ContactEmail {
  return {
    from: CONTACT_FROM,
    to,
    replyTo: input.email,
    subject: `julianpalomo.dev: a message from ${input.name}`,
    text: `${input.message}\n\n— ${input.name} <${input.email}>\n\nSent with the contact form on julianpalomo.dev. Reply to this email to answer them.\n`,
  };
}

/** A thrown error's `code`, such as E_SENDER_NOT_VERIFIED, and nothing else from it. */
function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error;
    if (typeof code === "string") return code;
  }
  return "unknown";
}
