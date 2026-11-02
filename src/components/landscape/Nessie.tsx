import { useId } from "react";
import { NESSIE } from "../../lib/scene/valley";

/**
 * Nessie, the loch's easter egg (DESIGN.md section 7): a neck and head and
 * two humps, from docs/design/nessie.svg, rising at `x` from the waterline,
 * gliding to the right and sinking again, once a visit. The clip is the
 * water's surface: she moves inside it and only what's above it shows.
 * Never announced; the landscape is `aria-hidden`.
 */
export function Nessie({ x }: { x: number }) {
  const clip = `landscape-nessie-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <g className="nessie" transform={`translate(${x} ${NESSIE.y})`}>
      <clipPath id={clip}>
        <rect x="-20" y="-30" width={70 + NESSIE.glide} height="30" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="nessie-body">
          <path d="M12 0 C 12 -6 14 -11 18 -12 C 21 -12.6 25 -11.6 26 -9.6 C 26.6 -8.4 25.4 -7.6 23.6 -8 C 21.8 -8.4 20 -8.6 19 -7.4 C 17.6 -5.6 17.6 -2.6 18 0 Z" />
          <path d="M1 0 C 1 -5.4 9 -5.4 9 0 Z" />
          <path d="M-8 0 C -8 -3.4 -2.4 -3.4 -2.4 0 Z" />
          <circle className="nessie-eye" cx="21.4" cy="-10.4" r="0.7" />
        </g>
      </g>
      <ellipse className="nessie-ring" cx="9" cy="0.4" rx="20" ry="1.6" />
    </g>
  );
}
