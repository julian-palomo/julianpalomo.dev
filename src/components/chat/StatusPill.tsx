/**
 * What a voice question is doing, in words, with three bouncing dots (still
 * with reduced motion): "Listening…", then "Transcribing…".
 */
export function StatusPill({ text }: { text: string }) {
  return (
    <p className="flex w-fit items-center gap-2 rounded-full bg-background px-3 py-1 text-[12.5px] font-medium text-muted">
      {text}
      <span aria-hidden="true" className="status-dots">
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}
