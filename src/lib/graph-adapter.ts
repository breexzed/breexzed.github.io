import type { GraphContracts, GraphContractsInput, GraphEdgeView, GraphTypeColorTokens, Node } from '@/types';

const TYPE_COLORS: GraphTypeColorTokens = {
  note: '#8ba2bf',
  essay: '#7ea4c9',
  page: '#8f9cbf',
  projects: '#88c0d0',
  articulation: '#a3be8c',
  signal: '#ebcb8b',
  trail: '#d08770',
  concept: '#b48ead'
};

function addNeighbor(adjacency: Record<string, Set<string>>, from: string, to: string): void {
  if (!adjacency[from]) adjacency[from] = new Set<string>();
  adjacency[from].add(to);
}

function connect(adjacency: Record<string, Set<string>>, a: string, b: string): void {
  addNeighbor(adjacency, a, b);
  addNeighbor(adjacency, b, a);
}

function buildEdges(nodes: GraphContractsInput): GraphEdgeView[] {
  const edges: GraphEdgeView[] = [];
  for (const node of Object.values(nodes)) {
    for (const childId of node.children || []) {
      if (!nodes[childId]) continue;
      edges.push({
        id: `${node.id}::${childId}::parent`,
        source: node.id,
        target: childId,
        relation: 'parent-child'
      });
    }
    for (const targetId of node.connects || []) {
      if (!nodes[targetId]) continue;
      edges.push({
        id: `${node.id}::${targetId}::connects`,
        source: node.id,
        target: targetId,
        relation: 'connects'
      });
    }
  }
  return edges;
}

export function buildGraphContracts(nodes: GraphContractsInput): GraphContracts {
  const edges = buildEdges(nodes);
  const adjacencySets: Record<string, Set<string>> = {};

  for (const id of Object.keys(nodes)) {
    if (!adjacencySets[id]) adjacencySets[id] = new Set<string>();
  }
  for (const edge of edges) {
    connect(adjacencySets, edge.source, edge.target);
  }

  const adjacency = Object.fromEntries(
    Object.entries(adjacencySets).map(([id, neighbors]) => [id, Array.from(neighbors).sort((a, b) => a.localeCompare(b))])
  );

  const graphNodes = Object.fromEntries(
    Object.values(nodes).map((node: Node) => {
      const neighbors = adjacency[node.id] || [];
      return [
        node.id,
        {
          id: node.id,
          type: node.type,
          title: node.title,
          degree: neighbors.length,
          neighbors
        }
      ];
    })
  );

  return {
    nodes: graphNodes,
    edges,
    adjacency,
    typeColors: TYPE_COLORS,
    interactions: {
      mode: 'hybrid',
      tapSelect: true,
      keyboardParity: true,
      hoverRequired: false
    }
  };
}
