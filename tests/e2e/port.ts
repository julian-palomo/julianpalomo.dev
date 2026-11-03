/**
 * The port an e2e run serves its build on. Playwright loads the config in the
 * runner and again in every worker, so the port must come out the same in
 * each: never pick a free port or anything random here.
 */
import { z } from "zod";

/** CI's port, kept so its logs don't change. */
export const CI_PORT = 4173;

const FIRST = 4200;
const COUNT = 800;

const portSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1024).max(65535));

type Env = { E2E_PORT?: string | undefined; CI?: string | undefined };

/**
 * `E2E_PORT` when set; else 4173 in CI; else a port from 4200 to 4999 that
 * depends only on the worktree's folder, so two worktrees running e2e at once
 * don't wait on each other.
 */
export function e2ePort(env: Env, root: string): number {
  if (env.E2E_PORT !== undefined) {
    const port = portSchema.safeParse(env.E2E_PORT);
    if (!port.success) {
      throw new Error(`E2E_PORT must be a whole number from 1024 to 65535, not "${env.E2E_PORT}".`);
    }
    return port.data;
  }
  if (env.CI) return CI_PORT;
  return FIRST + (fnv1a(root) % COUNT);
}

/** 32-bit FNV-1a: small, stable across processes and Node versions. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
