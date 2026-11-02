import { Nessie } from "./Nessie";
import type { Spot } from "./use-valley";

type Props = {
  /** Rings where the pointer touched the water, the rain's own (DESIGN.md section 7). */
  ripples: readonly Spot[];
  /** Where Nessie rises, while she's up. */
  nessie: Spot | null;
};

/**
 * The loch, its shimmer and the sun's reflection, the islet with its ruined
 * tower, and rain ripples; and, only while they last, the pointer's ripples
 * and Nessie, so the still drawing never has them.
 */
export function Loch({ ripples, nessie }: Props) {
  return (
    <>
      <path
        className="loch"
        d="M250 254 C 380 238 600 234 820 238 C 900 240 960 244 1000 248 C 900 256 700 262 500 264 C 400 264 310 260 250 254 Z"
      />
      <g className="shimmer">
        <path
          d="M330 252 h34 M450 246 h22 M560 250 h40 M760 244 h24 M860 246 h18"
          strokeLinecap="round"
        />
      </g>
      <ellipse className="reflect" cx="600" cy="250" rx="30" ry="2.4" />
      <g className="islet">
        <ellipse cx="700" cy="246" rx="30" ry="4.5" className="islet-land" />
        <path
          className="ruin"
          d="M693 245 L693 222 L695 222 L695 219 L698 219 L698 222 L701 222 L701 219 L704 219 L704 222 L706 222 L706 245 Z"
        />
        <rect className="ruin-win" x="698" y="228" width="3" height="5" />
        <path className="ruin" d="M706 245 L706 236 L712 238 L713 245 Z" />
      </g>
      <g className="ripples">
        <circle cx="400" cy="254" r="6" />
        <circle cx="520" cy="250" r="6" />
        <circle cx="640" cy="256" r="6" />
        <circle cx="820" cy="246" r="6" />
      </g>
      {ripples.map(({ id, x, y }) => (
        <g key={id} className="ripple-at" transform={`translate(${x} ${y})`}>
          <circle r="6" />
          <circle r="6" />
          <circle r="6" />
        </g>
      ))}
      {nessie && <Nessie key={nessie.id} x={nessie.x} />}
    </>
  );
}
