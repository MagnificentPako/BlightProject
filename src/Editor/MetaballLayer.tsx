import { useNodes, useViewport, type Node } from "@xyflow/react";
import type { AtlasNodeData } from "./AtlasData";

// Flow-space radius of each metaball. Larger than the node itself so
// neighboring balls start blending together well before the nodes touch.
// Used as the fallback whenever a node doesn't set its own color/radius.
export const DEFAULT_METABALL_RADIUS = 55;
export const DEFAULT_METABALL_COLOR = "#8b5cf6";

// Default node box size, used as a fallback until React Flow has measured
// the rendered node (`node.measured` is only populated after first paint).
const FALLBACK_WIDTH = 86;
const FALLBACK_HEIGHT = 96;

// Wobbly-edge goo filter: blur merges nearby blobs, a steep alpha threshold
// snaps the blur back to a hard edge, then that edge is displaced by a fixed
// (non-animated) turbulence field so it reads as organic/hand-drawn rather
// than a perfect circle. Static mirror of the "goo-wobble" filter from the
// noisy-edge-metaballs reference demo, with the per-frame noise drift removed.
const BLUR_STD_DEVIATION = 10;
const THRESH_SLOPE = 6;
const THRESH_INTERCEPT = -2.7;
const OPACITY_SLOPE = 0.65;
const WOBBLE_BASE_FREQUENCY = 0.05;
const WOBBLE_OCTAVES = 3;
const WOBBLE_SEED = 5;
const WOBBLE_DISPLACEMENT_SCALE = 40;

// Surface translucency variation: a second, coarser noise field remapped to
// an alpha mask and multiplied over the blob shape, so opacity drifts across
// the merged surface like light through water instead of one flat fill.
// "turbulence" (vs. "fractalNoise") gives it a more veined, glinting quality
// than plain water, closer to a magical shimmer. Static, like the edge wobble.
const CAUSTIC_BASE_FREQUENCY = 0.015;
const CAUSTIC_OCTAVES = 2;
const CAUSTIC_SEED = 11;
const CAUSTIC_ALPHA_MIN = 0.55;
const CAUSTIC_ALPHA_MAX = 1;

export function MetaballLayer() {
    const nodes = useNodes<Node<AtlasNodeData>>();
    const { x, y, zoom } = useViewport();

    const balls = nodes.filter((node) => node.data?.hasMetaballEffect);

    if (balls.length === 0) return null;

    return (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
                <filter
                    id="metaball-goo"
                    x="-18%"
                    y="-38%"
                    width="136%"
                    height="176%"
                    colorInterpolationFilters="sRGB"
                >
                    <feGaussianBlur in="SourceGraphic" stdDeviation={BLUR_STD_DEVIATION} result="blur" />
                    <feComponentTransfer in="blur" result="premask">
                        <feFuncA type="linear" slope={THRESH_SLOPE} intercept={THRESH_INTERCEPT} />
                    </feComponentTransfer>
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency={WOBBLE_BASE_FREQUENCY}
                        numOctaves={WOBBLE_OCTAVES}
                        seed={WOBBLE_SEED}
                        result="noise"
                    />
                    <feDisplacementMap
                        in="premask"
                        in2="noise"
                        scale={WOBBLE_DISPLACEMENT_SCALE}
                        xChannelSelector="R"
                        yChannelSelector="G"
                        result="mask"
                    />
                    <feComponentTransfer in="mask" result="shape">
                        <feFuncA type="linear" slope={OPACITY_SLOPE} intercept="0" />
                    </feComponentTransfer>

                    <feTurbulence
                        type="turbulence"
                        baseFrequency={CAUSTIC_BASE_FREQUENCY}
                        numOctaves={CAUSTIC_OCTAVES}
                        seed={CAUSTIC_SEED}
                        result="causticNoise"
                    />
                    <feColorMatrix in="causticNoise" type="luminanceToAlpha" result="causticAlpha" />
                    <feComponentTransfer in="causticAlpha" result="causticMask">
                        <feFuncA
                            type="linear"
                            slope={CAUSTIC_ALPHA_MAX - CAUSTIC_ALPHA_MIN}
                            intercept={CAUSTIC_ALPHA_MIN}
                        />
                    </feComponentTransfer>
                    <feComposite in="shape" in2="causticMask" operator="in" />
                </filter>
            </defs>
            <g transform={`translate(${x}, ${y}) scale(${zoom})`} filter="url(#metaball-goo)">
                {balls.map((node) => {
                    const width = node.measured?.width ?? FALLBACK_WIDTH;
                    const height = node.measured?.height ?? FALLBACK_HEIGHT;
                    return (
                        <circle
                            key={node.id}
                            cx={node.position.x + width / 2}
                            cy={node.position.y + height / 2}
                            r={node.data.metaballRadius ?? DEFAULT_METABALL_RADIUS}
                            fill={node.data.metaballColor ?? DEFAULT_METABALL_COLOR}
                        />
                    );
                })}
            </g>
        </svg>
    );
}
