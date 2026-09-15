import { forceLayout } from "@tanstack/charts/network/force";
import { Chart } from "@tanstack/charts/react"
import { atlas } from "./atlasNodes";
import { defineChart, dot, link } from "@tanstack/charts";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { useEffect, useRef, useState } from "react";
import { zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import { tooltip } from "@tanstack/charts/tooltip";

function forceExcludeCircle(zone: { cx: number; cy: number; r: number }) {
    type WorkingNode = {
        x?: number | null;
        y?: number | null;
    };

    let nodes: WorkingNode[] = []
    function force() {
        for (const node of nodes) {
            if (node.x == null || node.y == null) continue
            const dx = node.x - zone.cx
            const dy = node.y - zone.cy
            const dist = Math.hypot(dx, dy) || 1e-6
            if (dist < zone.r) {
                const scale = zone.r / dist
                node.x = zone.cx + dx * scale
                node.y = zone.cy + dy * scale
            }
        }
    }
    force.initialize = (_nodes: WorkingNode[], _random: () => number): void => {
        nodes = _nodes
    }
    return force
}

function forceClusterToGroupAnchor(
  hopDistance: Map<string, number>,
  { strength = 0.15, hopSpacing = 30 } = {},
) {
  type ClusterNode = {
    id: string
    group: number
    isAnchor?: boolean
    fx?: number | null
    fy?: number | null
    x?: number
    y?: number
    vx?: number
    vy?: number
  }

  let nodes: ClusterNode[] = []
  let anchorPositionByGroup: Map<number | string, { x: number; y: number }>

  function force(alpha: number) {
    for (const node of nodes) {
      if (node.isAnchor) continue
      const anchor = anchorPositionByGroup.get(node.group)
      if (!anchor || node.x == null || node.y == null) continue

      const hop = hopDistance.get(node.id) ?? 1
      const dx = node.x - anchor.x
      const dy = node.y - anchor.y
      const dist = Math.hypot(dx, dy) || 1
      const targetDist = hop * hopSpacing
      const targetX = anchor.x + (dx / dist) * targetDist
      const targetY = anchor.y + (dy / dist) * targetDist

      node.vx ??= 0
      node.vy ??= 0
      node.vx += (targetX - node.x) * strength * alpha
      node.vy += (targetY - node.y) * strength * alpha
    }
  }

  force.initialize = (_nodes: ClusterNode[], _random: () => number) => {
    nodes = _nodes
    anchorPositionByGroup = new Map(
      nodes.filter((n) => n.isAnchor).map((n) => [n.group, { x: n.fx!, y: n.fy! }]),
    )
  }

  return force
}

function hopDistanceFromAnchors(
  nodes: { id: string }[],
  links: { source: string; target: string }[],
  anchorIds: string[],
): Map<string, number> {
  const adjacency = new Map<string, string[]>()
  for (const node of nodes) adjacency.set(node.id, [])
  for (const link of links) {
    adjacency.get(link.source)?.push(link.target)
    adjacency.get(link.target)?.push(link.source)
  }

  const hopDistance = new Map<string, number>()
  const queue: string[] = []
  for (const id of anchorIds) {
    hopDistance.set(id, 0)
    queue.push(id)
  }

  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    const currentHop = hopDistance.get(current)!
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!hopDistance.has(neighbor)) {
        hopDistance.set(neighbor, currentHop + 1)
        queue.push(neighbor)
      }
    }
  }

  return hopDistance
}

const linkTiers = [
  { maxHop: 0, distance: 30, strength: 1 },     // touches an anchor directly
  { maxHop: 1, distance: 50, strength: 0.75 },  // one step further out
  { maxHop: 2, distance: 60, strength: 0.55 },
  { maxHop: Infinity, distance: 70, strength: 0.4 }, // everything beyond
]

function tierForLink(
  link: { source: string; target: string },
  hopDistance: Map<string, number>,
) {
  const closerHop = Math.min(
    hopDistance.get(link.source) ?? Infinity,
    hopDistance.get(link.target) ?? Infinity,
  )
  return linkTiers.find((tier) => closerHop <= tier.maxHop) ?? linkTiers.at(-1)!
}

function forceCollideExceptPairs(
  radius: (node: any) => number,
  exemptPairs: Set<string>, // "idA|idB", sorted
  strength = 0.9,
) {
  type CollisionNode = {
    id: string
    x?: number
    y?: number
    vx?: number
    vy?: number
  }

  let nodes: CollisionNode[] = []

  function force() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        if (a.x == null || a.y == null || b.x == null || b.y == null) continue
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
        if (exemptPairs.has(key)) continue // <- the whole point

        const dx = b.x - a.x
        const dy = b.y - a.y
        const minDist = radius(a) + radius(b)
        const distSq = dx * dx + dy * dy
        if (distSq === 0 || distSq >= minDist * minDist) continue

        const dist = Math.sqrt(distSq)
        const push = ((minDist - dist) / dist) * strength * 0.5
        a.vx = (a.vx ?? 0) - dx * push
        a.vy = (a.vy ?? 0) - dy * push
        b.vx = (b.vx ?? 0) + dx * push
        b.vy = (b.vy ?? 0) + dy * push
      }
    }
  }

  force.initialize = (_nodes: CollisionNode[], _random: () => number) => {
    nodes = _nodes
  }

  return force
}

export default function Atlas() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState(zoomIdentity);
    const FIXED_X_DOMAIN: [number, number] = [-800, 800];
    const FIXED_Y_DOMAIN: [number, number] = [-800, 800];

    const anchorIds = new Set(atlas.nodes.filter((n) => n.isAnchor).map((n) => n.id));
    const hopDistance = hopDistanceFromAnchors(atlas.nodes, atlas.links, Array.from(anchorIds));

    const exemptPairs = new Set<string>()
        for (const link of atlas.links) {
        if (anchorIds.has(link.source) || anchorIds.has(link.target)) {
            const key =
            link.source < link.target
                ? `${link.source}|${link.target}`
                : `${link.target}|${link.source}`
            exemptPairs.add(key)
        }
    }

    const graph = forceLayout(atlas.nodes, atlas.links, {
        nodeKey: "id",
        source: "source",
        target: "target",
        iterations: 600,
        domainPadding: 0.1,
        forces: [
            {
                type: 'link',
                distance: (link) => tierForLink(link, hopDistance).distance,
                strength: (link) => tierForLink(link, hopDistance).strength,
            },
            { type: 'manyBody', strength: -30 },
            {
                type: 'custom',
                name: 'collide-except-anchor-links',
                create: () =>
                    forceCollideExceptPairs((d) => (d.isAnchor ? 30 : 32), exemptPairs, 0.8),
            },
            { type: 'x', x: 0, strength: 0.03 },
            { type: 'y', y: 0, strength: 0.03 },
            { 
                type: 'custom',
                name: "exclude-center",
                create: () => forceExcludeCircle({ cx: 0, cy: 0, r: 150 })
            },
            {
                type: 'custom',
                name: "cluster-to-group-anchor",
                create: () => forceClusterToGroupAnchor(hopDistance, { strength: 0.15, hopSpacing: 30})
            }
        ]
    });

    const atlasChart = defineChart(
        {
            marks: [
                link(graph.links, {
                    id: "network-links",
                    x1: "x1",
                    y1: "y1",
                    x2: "x2",
                    y2: "y2",
                    key: ({ source, target }) => `${source}->${target}`,
                    stroke: "black",
                    strokeOpacity: 0.6,
                    strokeWidth: 2
                }),
                dot(graph.nodes, {
                    id: "network-nodes",
                    x: "x",
                    y: "y",
                    key: "id",
                    r: 9,
                    stroke: "black",
                    strokeWidth: 2,
                    color: (d) => (d.isAnchor ? '#e2b13c' : '#5c8df6'),
                })
            ],
            scales: {
                x: {
                    scale: scaleLinear().domain(FIXED_X_DOMAIN)
                },
                y: {
                    scale: scaleLinear().domain(FIXED_Y_DOMAIN)
                }
            },

            guides: false,
            tooltip: {
                use: tooltip,
                ...{
                    format: ({ datum }) => {
                        return `ID: ${datum.id}`;
                    }
                }
            }
        }
    );

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const { width, height } = el.getBoundingClientRect();

        const behaviour = zoom<HTMLDivElement, unknown>()
            .scaleExtent([0.4, 4])
            .translateExtent([
                [-width * 0.5, -height * 0.5],
                [width * 1.5, height * 1.5],
            ])
            .on('zoom', (event) => {
                setTransform(event.transform);
            });

        select(el).call(behaviour);
        return () => {
            select(el).on('.zoom', null);
        }
    }, []);


    return (
        <>
            <div ref={wrapperRef} style={{ overflow: "hidden", touchAction: "none", height: 1200, width: 1600 }}>
                <div style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                    transformOrigin: '0 0',
                    backgroundImage: "url(/public/BPLAtlas.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}>
                    <Chart
                        definition={atlasChart}
                        ariaLabel="Example bar chart"
                        height={1200}
                        width={1600}
                    />
                </div>
            </div>
        </>
    )
}