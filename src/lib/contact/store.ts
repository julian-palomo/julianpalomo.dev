/**
 * Today's count of contact messages per visitor, in D1
 * (migrations/0002_contact_messages.sql). Only the count is kept: the message,
 * the visitor's name and address are never stored. A visitor is the same
 * anonymous daily hash the chat's limits use (visitorHash in
 * src/lib/bot/usage.ts). Like the chat's, two requests at once can both pass,
 * so a visitor can go over by one message.
 */
import type { D1Like } from "../bot/usage";

/** Messages one visitor may send in a UTC day. */
export const CONTACT_DAILY_LIMIT = 5;

export type ContactStore = {
  sentToday(day: string, visitor: string): Promise<number>;
  countSent(day: string, visitor: string): Promise<void>;
};

export function d1ContactStore(db: D1Like): ContactStore {
  return {
    async sentToday(day, visitor) {
      const row = await db
        .prepare("SELECT messages FROM contact_messages WHERE visitor_hash = ? AND day = ?")
        .bind(visitor, day)
        .first<{ messages: number }>();
      return row?.messages ?? 0;
    },
    async countSent(day, visitor) {
      await db
        .prepare(
          `INSERT INTO contact_messages (visitor_hash, day, messages) VALUES (?, ?, 1)
           ON CONFLICT (visitor_hash, day) DO UPDATE SET messages = messages + 1`,
        )
        .bind(visitor, day)
        .run();
    },
  };
}
