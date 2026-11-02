import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { contactInputSchema } from "./schema";

/**
 * Sends the contact form's message (docs/contact.md). The input is validated
 * with the form's own schema; a request that fails it never reaches
 * handleContact. The visitor's IP goes to Turnstile and into the daily hash,
 * and is never logged or stored.
 */
export const sendContact = createServerFn({ method: "POST" })
  .validator(contactInputSchema)
  .handler(async ({ data }) => {
    // Imported here so the Workers runtime module and the server logic stay
    // out of the browser bundle.
    const { env } = await import("cloudflare:workers");
    const { handleContact } = await import("./send");
    return handleContact(data, env, getRequestHeader("CF-Connecting-IP"));
  });
