import type { Node, NodeType } from './Node';

export type GraphInteractionMode = 'touch-first' | 'keyboard-first' | 'hybrid';

export interface GraphTypeColorTokens {
  note: string;
  essay: string;
  page: string;
  projects: string;
  articulation: string;
  signal: string;
  trail: string;
  concept: string;
}

export interface GraphNodeView {
  id: string;
  type: NodeType;
  title: string;
  degree: number;
  neighbors: string[];
}

export interface GraphEdgeView {
  id: string;
  source: string;
  target: string;
  relation: 'parent-child' | 'connects';
}

export interface GraphContracts {
  nodes: Record<string, GraphNodeView>;
  edges: GraphEdgeView[];
  adjacency: Record<string, string[]>;
  typeColors: GraphTypeColorTokens;
  interactions: {
    mode: GraphInteractionMode;
    tapSelect: true;
    keyboardParity: true;
    hoverRequired: false;
  };
}

export type GraphContractsInput = Record<string, Node>;
