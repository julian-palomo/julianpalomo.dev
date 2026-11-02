/**
 * What the contact form sends (DESIGN.md section 14), and how the server
 * answers. Browser-safe: the form checks each field with the same schema the
 * server function validates with.
 */
import { z } from "zod";

export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
// Turnstile's tokens are at most 2,048 characters.
const TOKEN_MAX = 2048;

// No line breaks or other control characters in the name: it goes into the
// email's subject line.
const singleLine = /^[^\p{Cc}]*$/u;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX).regex(singleLine),
  email: z.email().max(254),
  message: z.string().trim().min(MESSAGE_MIN).max(MESSAGE_MAX),
  // The hidden field only bots fill in; a person leaves it empty.
  website: z.string().max(200),
  token: z.string().min(1).max(TOKEN_MAX),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

/** The fields a visitor fills in, each checked on its own as they write. */
export type ContactField = "name" | "email" | "message";

/** Why a message didn't go, each with its own copy in the form. */
export type ContactErrorCode =
  // The visitor's own day is used up.
  | "limit"
  // Turnstile didn't confirm a person, or couldn't be reached.
  | "verification"
  // The form isn't set up here (a missing secret or binding).
  | "unavailable"
  // Everything checked out but the email didn't go.
  | "send";

export type ContactResult = { status: "sent" } | { status: "error"; code: ContactErrorCode };
