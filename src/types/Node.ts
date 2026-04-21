export type NodeType = 'note' | 'projects' | 'essay' | 'page' | 'articulation' | 'signal' | 'trail' | 'concept';

export type NodeStatus = 'draft' | 'published' | 'archived' | 'private';

export type TabType = 'explorer' | 'content' | 'diagram';

export interface Node {
  id: string;
  title: string;
  formula: string;
  depth: number;
  parent: string | null;
  children: string[];
  connects?: string[];
  content: string;
  markdown: string;
  desc: string;
  label: string;
  glyph: string;
  tags: string[];
  date: string;
  source: string;
  type: NodeType;
  featured?: boolean;
  thumbnail?: string;
  visual?: string;
  externalUrl?: string;
  publishDate?: string;
  status?: NodeStatus;
  first_noticed?: string;
  current_status?: 'invisible' | 'emerging' | 'confirmed' | 'shocked';
  domain?: string;
  date_of_discovery?: string;
}

export interface TopologyMetadata {
  version: string;
  builder: string;
  source: string;
  profile?: 'legacy' | 'strict';
}

export interface Topology {
  generated: string;
  nodeCount: number;
  nodes: Record<string, Node>;
  treeOrder: string[];
  metadata: TopologyMetadata;
}

export interface NavigationState {
  activeNode: string;
  activeTab: TabType;
  breadcrumb: string[];
  history: string[];
}

export interface ViewFilter {
  type?: NodeType;
  tags?: string[];
  featured?: boolean;
  status?: NodeStatus;
  search?: string;
}
