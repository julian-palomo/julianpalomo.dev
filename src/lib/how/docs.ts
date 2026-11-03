/**
 * The repository's documents the How it's built page links to, each from the
 * step of a diagram it explains (DESIGN.md section 18). Every path must exist
 * in the repo: tests/e2e/how-its-built.spec.ts checks each one.
 */

const REPO = "https://github.com/julian-palomo/julianpalomo.dev/blob/main";

const DOCS = [
  "docs/architecture.md",
  ".claude/rules/claims.md",
  "docs/adr/2026-11-02-cached-suggestion-answers.md",
  ".claude/skills/implement-issue/SKILL.md",
  "AGENTS.md#2-workflow",
  ".claude/README.md",
  ".claude/skills/ship-pr/SKILL.md",
  "docs/evals.md",
  "AGENTS.md#1-hard-constraints",
  "docs/adr/README.md",
] as const;

export type Doc = (typeof DOCS)[number];

/** The document on GitHub, on `main`. */
export function docUrl(doc: Doc): string {
  return `${REPO}/${doc}`;
}
