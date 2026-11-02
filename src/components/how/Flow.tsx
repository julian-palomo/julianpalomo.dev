import { useId } from "react";

/** One box in a flow, top to bottom. */
export type FlowNode = {
  label: string;
  /** Drawn as a stack of three boxes: several of the same thing. */
  stack?: boolean;
  /** A dashed box: something that carries notes between two others. */
  dashed?: boolean;
  /** The flow's end, in `accent`. */
  accent?: boolean;
  /** A second box beside this one, joined both ways: what this one reads. */
  aside?: string;
};

const WIDTH = 320;
const BOX_W = 196;
const BOX_H = 40;
const GAP = 22;
const ASIDE_W = 104;

/**
 * A flow drawn as an inline SVG in the site's tokens, so it follows both
 * themes (DESIGN.md section 18): boxes top to bottom, joined by arrows. With
 * an `aside`, the box sits left and its partner right. The SVG is hidden from
 * screen readers: the caller's wrapper gives it its accessible name, or
 * marks it as decoration, and gives its text alternative.
 */
export function Flow({ nodes }: { nodes: readonly FlowNode[] }) {
  const height = nodes.length * (BOX_H + GAP) - GAP + 8;
  // Two flows can share a page, so their arrowheads' ids must differ.
  // useId's characters (":" or "«»") don't belong in url(#…), so only its letters and digits are kept.
  const id = `flow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const arrow = `${id}-arrow`;
  const arrowBack = `${id}-arrow-back`;
  return (
    // Its wrapper names it (role="img") or hides it as decoration.
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto block h-auto w-full max-w-[340px] text-foreground"
    >
      {nodes.map((node, index) => {
        const y = 4 + index * (BOX_H + GAP);
        const x = node.aside ? 4 : (WIDTH - BOX_W) / 2;
        const width = node.aside ? WIDTH - ASIDE_W - 30 : BOX_W;
        const next = index < nodes.length - 1;
        const centre = x + width / 2;
        return (
          <g key={node.label}>
            {node.stack && (
              <>
                <rect
                  x={x + 8}
                  y={y - 6}
                  width={width}
                  height={BOX_H}
                  rx={10}
                  className="fill-tint stroke-border"
                  strokeWidth={1.5}
                />
                <rect
                  x={x + 4}
                  y={y - 3}
                  width={width}
                  height={BOX_H}
                  rx={10}
                  className="fill-tint stroke-border"
                  strokeWidth={1.5}
                />
              </>
            )}
            <rect
              x={x}
              y={y}
              width={width}
              height={BOX_H}
              rx={10}
              className={node.accent ? "fill-accent stroke-accent" : "fill-tint stroke-border"}
              strokeWidth={1.5}
              strokeDasharray={node.dashed ? "5 4" : undefined}
            />
            <text
              x={centre}
              y={y + BOX_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className={node.accent ? "fill-on-accent" : "fill-current"}
              fontSize={13}
              fontWeight={600}
            >
              {node.label}
            </text>
            {node.aside && (
              <>
                <line
                  x1={x + width + 4}
                  y1={y + BOX_H / 2}
                  x2={WIDTH - ASIDE_W - 6}
                  y2={y + BOX_H / 2}
                  className="stroke-muted"
                  strokeWidth={1.5}
                  markerStart={`url(#${arrowBack})`}
                  markerEnd={`url(#${arrow})`}
                />
                <rect
                  x={WIDTH - ASIDE_W - 4}
                  y={y}
                  width={ASIDE_W}
                  height={BOX_H}
                  rx={10}
                  className="fill-tint stroke-border"
                  strokeWidth={1.5}
                />
                <text
                  x={WIDTH - ASIDE_W / 2 - 4}
                  y={y + BOX_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-current"
                  fontSize={12}
                  fontWeight={600}
                >
                  {node.aside}
                </text>
              </>
            )}
            {next && (
              <line
                x1={WIDTH / 2}
                y1={y + BOX_H + 2}
                x2={WIDTH / 2}
                y2={y + BOX_H + GAP - 4}
                className="stroke-muted"
                strokeWidth={1.5}
                markerEnd={`url(#${arrow})`}
              />
            )}
          </g>
        );
      })}
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 8 8"
          refX={7}
          refY={4}
          markerWidth={7}
          markerHeight={7}
          orient="auto"
        >
          <path d="M0 0L8 4L0 8z" className="fill-muted" />
        </marker>
        <marker
          id={arrowBack}
          viewBox="0 0 8 8"
          refX={1}
          refY={4}
          markerWidth={7}
          markerHeight={7}
          orient="auto"
        >
          <path d="M8 0L0 4L8 8z" className="fill-muted" />
        </marker>
      </defs>
    </svg>
  );
}
