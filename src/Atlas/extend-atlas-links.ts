// extend-atlas-links.ts
//
// Ensures every node in a node/link graph belongs to a single connected
// component, then adds a few extra edges so nodes aren't left with just
// one connection (real "map" networks usually give each node 2-4 links).
//
// Usage:
//   import { atlas } from './atlas'
//   import { extendAtlasLinks } from './extend-atlas-links'
//
//   const links = extendAtlasLinks(atlas.nodes, atlas.links, { seed: 42 })
//   console.log(JSON.stringify(links, null, 4))

type AtlasNode = { id: string; [key: string]: unknown }
type AtlasLink = { source: string; target: string; value?: number }

interface ExtendOptions {
  /** Deterministic seed. Omit for a different result each run. */
  seed?: number
  /** Chance per node, after connectivity is guaranteed, of adding one more random edge. */
  extraEdgeChance?: number
}

// mulberry32 - tiny seedable PRNG, good enough for "pick a random node"
function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

// Union-find so we can tell which nodes are already reachable from each
// other through the existing links.
class DisjointSet {
  private parent = new Map<string, string>()

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id)
  }

  find(id: string): string {
    const p = this.parent.get(id)
    if (p === undefined) throw new Error(`Unknown node: ${id}`)
    if (p === id) return id
    const root = this.find(p)
    this.parent.set(id, root) // path compression
    return root
  }

  union(a: string, b: string) {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) this.parent.set(rootA, rootB)
  }
}

export function extendAtlasLinks(
  nodes: readonly AtlasNode[],
  links: readonly AtlasLink[],
  { seed = Date.now(), extraEdgeChance = 0.15 }: ExtendOptions = {},
): AtlasLink[] {
  const rng = createRng(seed)
  const result: AtlasLink[] = links.map((l) => ({ ...l }))

  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const existingEdges = new Set(result.map((l) => edgeKey(l.source, l.target)))

  const dsu = new DisjointSet()
  for (const node of nodes) dsu.add(node.id)
  for (const link of result) dsu.union(link.source, link.target)

  const addLink = (source: string, target: string) => {
    const key = edgeKey(source, target)
    if (source === target || existingEdges.has(key)) return false
    existingEdges.add(key)
    result.push({ source, target, value: 1 })
    dsu.union(source, target)
    return true
  }

  // --- Pass 1: guarantee a single connected component --------------------
  // Group nodes by their current component, then repeatedly wire two
  // different components together via a random node from each, until only
  // one component remains. This grows a random spanning forest and merges
  // it, rather than threading one long chain through the whole map.
  const componentsOf = () => {
    const map = new Map<string, string[]>()
    for (const node of nodes) {
      const root = dsu.find(node.id)
      const bucket = map.get(root)
      if (bucket) bucket.push(node.id)
      else map.set(root, [node.id])
    }
    return [...map.values()]
  }

  let components = componentsOf()
  while (components.length > 1) {
    const compA = pick(components, rng)
    const compB = pick(components, rng)
    if (compA === compB) {
      components = componentsOf()
      continue
    }
    addLink(pick(compA, rng), pick(compB, rng))
    components = componentsOf()
  }

  // --- Pass 2: a few extra edges so it doesn't read as a bare tree ------
  const ids = nodes.map((n) => n.id)
  for (const id of ids) {
    if (rng() < extraEdgeChance) {
      addLink(id, pick(ids, rng))
    }
  }
  return result
}