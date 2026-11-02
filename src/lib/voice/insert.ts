/**
 * Where a transcribed question goes: into the composer, after anything
 * already typed, and never sent on its own (DESIGN.md section 10).
 */

/** The composer's new text with `transcript` after `typed`, and where the caret goes: its end. */
export function withTranscript(
  typed: string,
  transcript: string,
): { value: string; caret: number } {
  const text = transcript.trim();
  const before = typed.trimEnd();
  const value = before === "" ? text : `${before} ${text}`;
  return { value, caret: value.length };
}
