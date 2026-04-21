import type { GraphContracts } from '@/types';

type GraphEngineOptions = {
  container: HTMLElement;
  contracts: GraphContracts;
  onNodeSelect: (nodeId: string) => void;
};

type GraphEngineMountResult = {
  usedCachedLayout: boolean;
};

type SigmaLike = {
  on: (event: string, handler: (payload: { node: string }) => void) => void;
  setSetting: (key: string, value: unknown) => void;
  refresh: () => void;
  kill: () => void;
};

type GraphLike = {
  addNode: (id: string, attributes: Record<string, unknown>) => void;
  addEdgeWithKey: (key: string, source: string, target: string, attributes: Record<string, unknown>) => void;
  getNodeAttributes: (id: string) => Record<string, unknown>;
  setNodeAttribute: (id: string, key: string, value: unknown) => void;
};

type GraphNodePosition = {
  x: number;
  y: number;
};

type GraphLayoutCache = {
  signature: string;
  positions: Record<string, GraphNodePosition>;
  updatedAt: string;
};

const GRAPH_LAYOUT_CACHE_PREFIX = 'breexzed.graph.layout.v1';

export class GraphEngine {
  private sigma: SigmaLike | null = null;
  private activeNode: string | null = null;
  private adjacency: Record<string, string[]> = {};

  async mount({ container, contracts, onNodeSelect }: GraphEngineOptions): Promise<GraphEngineMountResult> {
    const [{ default: Graph }, { default: Sigma }, { default: forceAtlas2 }] = await Promise.all([
      import('graphology'),
      import('sigma'),
      import('graphology-layout-forceatlas2')
    ]);

    const graph = new Graph() as unknown as GraphLike;
    this.adjacency = contracts.adjacency;

    Object.values(contracts.nodes).forEach(node => {
      graph.addNode(node.id, {
        label: node.title,
        size: Math.max(4, 3 + node.degree * 0.6),
        color: contracts.typeColors[node.type] || contracts.typeColors.note,
        x: Math.random(),
        y: Math.random(),
        nodeType: node.type
      });
    });

    contracts.edges.forEach(edge => {
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        size: edge.relation === 'connects' ? 1.8 : 1.1,
        color: edge.relation === 'connects' ? 'rgba(210,228,255,0.34)' : 'rgba(180,200,230,0.20)'
      });
    });

    const cachedPositions = this.readLayoutCache(contracts);
    const usedCachedLayout =
      cachedPositions !== null && this.applyCachedPositions(graph, contracts, cachedPositions);

    if (!usedCachedLayout) {
      forceAtlas2.assign(graph as any, {
        iterations: 120,
        settings: {
          gravity: 0.06,
          scalingRatio: 16
        }
      });
      this.writeLayoutCache(contracts, graph);
    }

    const sigma = new Sigma(graph as any, container, {
      renderLabels: true,
      labelDensity: 0.08,
      labelGridCellSize: 96,
      labelRenderedSizeThreshold: 7,
      defaultEdgeType: 'line'
    }) as SigmaLike;
    this.sigma = sigma;

    sigma.on('clickNode', ({ node }) => {
      onNodeSelect(node);
    });

    return { usedCachedLayout };
  }

  setActiveNode(nodeId: string): void {
    this.activeNode = nodeId;
    if (!this.sigma) return;
    const active = this.activeNode;
    const adjacency = this.adjacency;

    this.sigma.setSetting('nodeReducer', (id: string, data: Record<string, unknown>) => {
      if (!active) return data;
      if (id === active) {
        return { ...data, color: '#f2f9ff', size: Number(data.size || 6) * 1.45, zIndex: 2 };
      }
      if ((adjacency[active] || []).includes(id)) {
        return { ...data, size: Number(data.size || 5) * 1.1, zIndex: 1 };
      }
      return { ...data, color: 'rgba(124,148,184,0.25)', label: '' };
    });

    this.sigma.setSetting('edgeReducer', (edgeId: string, data: Record<string, unknown>) => {
      if (!active) return data;
      const [source, target] = edgeId.split('::');
      if (source === active || target === active) {
        return { ...data, color: 'rgba(230,241,255,0.48)', size: Number(data.size || 1.2) * 1.25 };
      }
      if ((adjacency[active] || []).includes(source) && (adjacency[active] || []).includes(target)) {
        return { ...data, color: 'rgba(180,200,230,0.32)' };
      }
      return { ...data, color: 'rgba(120,145,180,0.10)' };
    });

    this.sigma.refresh();
  }

  destroy(): void {
    if (!this.sigma) return;
    this.sigma.kill();
    this.sigma = null;
    this.activeNode = null;
    this.adjacency = {};
  }

  private buildLayoutSignature(contracts: GraphContracts): string {
    const nodeIds = Object.keys(contracts.nodes).sort().join('|');
    const edgeIds = contracts.edges
      .map(edge => `${edge.id}:${edge.source}>${edge.target}:${edge.relation}`)
      .sort()
      .join('|');
    return `nodes:${nodeIds}::edges:${edgeIds}`;
  }

  private buildLayoutStorageKey(signature: string): string {
    let hash = 0;
    for (let i = 0; i < signature.length; i += 1) {
      hash = (hash * 31 + signature.charCodeAt(i)) | 0;
    }
    return `${GRAPH_LAYOUT_CACHE_PREFIX}:${Math.abs(hash).toString(36)}`;
  }

  private readLayoutCache(contracts: GraphContracts): Record<string, GraphNodePosition> | null {
    try {
      const signature = this.buildLayoutSignature(contracts);
      const raw = localStorage.getItem(this.buildLayoutStorageKey(signature));
      if (!raw) return null;

      const cache = JSON.parse(raw) as GraphLayoutCache;
      if (cache.signature !== signature || !cache.positions) return null;
      return cache.positions;
    } catch (err) {
      console.warn('Failed to read graph layout cache:', err);
      return null;
    }
  }

  private writeLayoutCache(contracts: GraphContracts, graph: GraphLike): void {
    try {
      const signature = this.buildLayoutSignature(contracts);
      const positions = Object.keys(contracts.nodes).reduce<Record<string, GraphNodePosition>>((acc, nodeId) => {
        const attrs = graph.getNodeAttributes(nodeId);
        const x = Number(attrs.x);
        const y = Number(attrs.y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          acc[nodeId] = { x, y };
        }
        return acc;
      }, {});

      if (Object.keys(positions).length !== Object.keys(contracts.nodes).length) return;

      const payload: GraphLayoutCache = {
        signature,
        positions,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(this.buildLayoutStorageKey(signature), JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist graph layout cache:', err);
    }
  }

  private applyCachedPositions(
    graph: GraphLike,
    contracts: GraphContracts,
    positions: Record<string, GraphNodePosition>
  ): boolean {
    const nodeIds = Object.keys(contracts.nodes);
    if (!nodeIds.length) return false;

    for (const nodeId of nodeIds) {
      const position = positions[nodeId];
      if (!position) return false;
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return false;

      graph.setNodeAttribute(nodeId, 'x', position.x);
      graph.setNodeAttribute(nodeId, 'y', position.y);
    }

    return true;
  }
}
