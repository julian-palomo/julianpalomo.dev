import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { D1Like } from "../../src/lib/bot/usage";
import { type ContactInput, contactInputSchema, MESSAGE_MAX } from "../../src/lib/contact/schema";
import {
  CONTACT_FROM,
  type ContactDeps,
  type ContactEmail,
  handleContact,
  TEST_SECRET,
} from "../../src/lib/contact/send";
import { CONTACT_DAILY_LIMIT, type ContactStore } from "../../src/lib/contact/store";
import { verifyTurnstile } from "../../src/lib/contact/turnstile";

const TO = "julian@example.com";
const VISITOR_EMAIL = "visitor@example.org";
const MESSAGE = "Hello Julian, I'd like to talk about a role.";

const input: ContactInput = {
  name: "Ada",
  email: VISITOR_EMAIL,
  message: MESSAGE,
  website: "",
  token: "a-token",
};

/** Turnstile's siteverify, answering `success`, and the bodies it was asked with. */
function siteverify(success: boolean) {
  const bodies: unknown[] = [];
  const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ success, "error-codes": [] }));
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, bodies, calls: fetchFn };
}

/** An in-memory store, with today's count per visitor. */
function memoryStore(start = 0) {
  const counts = new Map<string, number>();
  const store: ContactStore = {
    async sentToday(day, visitor) {
      return counts.get(`${day}/${visitor}`) ?? start;
    },
    async countSent(day, visitor) {
      const key = `${day}/${visitor}`;
      counts.set(key, (counts.get(key) ?? start) + 1);
    },
  };
  return { store, counts };
}

/** A sender that records what it was given, or throws an error with `code`. */
function sender(failWith?: string) {
  const sent: ContactEmail[] = [];
  return {
    sent,
    binding: {
      async send(message: ContactEmail) {
        if (failWith) throw Object.assign(new Error("send failed"), { code: failWith });
        sent.push(message);
        return { messageId: "id" };
      },
    },
  };
}

const db: D1Like = {
  prepare: () => {
    throw new Error("the test's store is used instead");
  },
};

function setup({
  success = true,
  start = 0,
  failWith,
  env = {},
}: {
  success?: boolean;
  start?: number;
  failWith?: string;
  env?: Record<string, unknown>;
} = {}) {
  const verify = siteverify(success);
  const memory = memoryStore(start);
  const email = sender(failWith);
  const deps: ContactDeps = {
    fetch: verify.fetchFn,
    now: () => new Date("2026-11-02T12:00:00Z"),
    createStore: () => memory.store,
  };
  const fullEnv = {
    CONTACT_TO: TO,
    TURNSTILE_SECRET_KEY: "real-secret",
    VISITOR_SALT: "salt",
    DB: db,
    EMAIL: email.binding,
    ...env,
  };
  const send = (body: ContactInput = input, ip = "203.0.113.7") =>
    handleContact(body, fullEnv, ip, deps);
  return { send, verify, memory, email };
}

describe("contactInputSchema", () => {
  it("accepts a filled-in form", () => {
    expect(contactInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects a name that's empty, too long or spans lines", () => {
    for (const name of ["", " ", "a".repeat(101), "Ada\r\nBcc: someone@example.com"]) {
      expect(contactInputSchema.safeParse({ ...input, name }).success).toBe(false);
    }
  });

  it("rejects an address that isn't one", () => {
    for (const email of ["", "ada", "ada@", "@example.org", "ada example.org"]) {
      expect(contactInputSchema.safeParse({ ...input, email }).success).toBe(false);
    }
  });

  it("wants a message of 10 to 2,000 characters", () => {
    const at = (message: string) => contactInputSchema.safeParse({ ...input, message }).success;
    expect(at("a".repeat(9))).toBe(false);
    expect(at("a".repeat(10))).toBe(true);
    expect(at("a".repeat(MESSAGE_MAX))).toBe(true);
    expect(at("a".repeat(MESSAGE_MAX + 1))).toBe(false);
  });

  it("needs Turnstile's token", () => {
    expect(contactInputSchema.safeParse({ ...input, token: "" }).success).toBe(false);
  });
});

describe("verifyTurnstile", () => {
  it("asks siteverify with the secret, the token and the visitor's IP", async () => {
    const { fetchFn, bodies } = siteverify(true);
    expect(await verifyTurnstile("tok", "203.0.113.7", "secret", fetchFn)).toBe("ok");
    expect(bodies).toEqual([{ secret: "secret", response: "tok", remoteip: "203.0.113.7" }]);
  });

  it("says rejected when Turnstile doesn't confirm a person", async () => {
    expect(await verifyTurnstile("tok", undefined, "secret", siteverify(false).fetchFn)).toBe(
      "rejected",
    );
  });

  it("says unreachable on a network error or an answer it can't read", async () => {
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const garbled = vi.fn(async () => new Response("<html>")) as unknown as typeof fetch;
    expect(await verifyTurnstile("tok", undefined, "secret", down)).toBe("unreachable");
    expect(await verifyTurnstile("tok", undefined, "secret", garbled)).toBe("unreachable");
  });
});

describe("handleContact", () => {
  let logged: unknown[][];
  beforeEach(() => {
    logged = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  const neverLogsPrivate = () => {
    const text = JSON.stringify(logged);
    for (const secret of [MESSAGE, VISITOR_EMAIL, TO, "203.0.113.7", "a-token"]) {
      expect(text).not.toContain(secret);
    }
  };

  it("emails Julian with the visitor as Reply-To, then counts the message", async () => {
    const { send, email, memory } = setup();
    expect(await send()).toEqual({ status: "sent" });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({ from: CONTACT_FROM, to: TO, replyTo: VISITOR_EMAIL });
    expect(email.sent[0]?.text).toContain(MESSAGE);
    expect([...memory.counts.values()]).toEqual([1]);
    neverLogsPrivate();
  });

  it("answers a filled honeypot as sent, without checking, counting or sending", async () => {
    const { send, email, verify, memory } = setup();
    expect(await send({ ...input, website: "https://spam.example" })).toEqual({ status: "sent" });
    expect(verify.calls).not.toHaveBeenCalled();
    expect(email.sent).toEqual([]);
    expect(memory.counts.size).toBe(0);
  });

  it("sends nothing when Turnstile rejects the token", async () => {
    const { send, email } = setup({ success: false });
    expect(await send()).toEqual({ status: "error", code: "verification" });
    expect(email.sent).toEqual([]);
  });

  it("refuses the visitor's sixth message of the day", async () => {
    const { send, email } = setup({ start: CONTACT_DAILY_LIMIT - 1 });
    expect(await send()).toEqual({ status: "sent" });
    expect(await send()).toEqual({ status: "error", code: "limit" });
    expect(email.sent).toHaveLength(1);
  });

  it("doesn't count a message that failed to send, and logs only the error's code", async () => {
    const { send, memory } = setup({ failWith: "E_SENDER_DOMAIN_NOT_AVAILABLE" });
    expect(await send()).toEqual({ status: "error", code: "send" });
    expect(memory.counts.size).toBe(0);
    expect(logged).toEqual([["Contact email not sent:", "E_SENDER_DOMAIN_NOT_AVAILABLE"]]);
    neverLogsPrivate();
  });

  it("is unavailable, and asks nobody, without a secret or a binding", async () => {
    for (const missing of ["CONTACT_TO", "TURNSTILE_SECRET_KEY", "VISITOR_SALT", "DB", "EMAIL"]) {
      const { send, verify, email } = setup({ env: { [missing]: undefined } });
      expect(await send()).toEqual({ status: "error", code: "unavailable" });
      expect(verify.calls).not.toHaveBeenCalled();
      expect(email.sent).toEqual([]);
    }
  });

  it("in demo mode checks Turnstile with the test secret and never sends or counts", async () => {
    const { send, verify, email, memory } = setup({ env: { CONTACT_DEMO: "1" } });
    expect(await send()).toEqual({ status: "sent" });
    expect(verify.bodies).toEqual([expect.objectContaining({ secret: TEST_SECRET })]);
    expect(email.sent).toEqual([]);
    expect(memory.counts.size).toBe(0);
  });
});
