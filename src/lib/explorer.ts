import type { Node, TabType, Topology, NodeType, NodeStatus, GraphContracts } from '@/types';
import { Persistence } from './persistence';
import { renderTreeNav, renderDetailPanel } from '@components/index';
import { markdownHrefToNodeId } from '@/utils/markdown';
import { GraphStore } from './graph-store';

type ExplorerApi = {
  init: () => Promise<void>;
  navigate: (id: string, options?: NavigateOptions) => void;
  getActiveNode: () => string;
  getNodes: () => Record<string, Node>;
  getGraphContracts: () => GraphContracts | null;
};

type NavigateOptions = {
  tab?: TabType;
  scrollToMap?: boolean;
  updateHash?: boolean;
};

type NodeDraft = Omit<Node, 'type'> & { type?: NodeType; status?: NodeStatus };

let nodes: Record<string, Node> = {};
let treeOrder: string[] = [];
let activeNode = 'root';
let activeTab: TabType = 'explorer';
let breadcrumb: string[] = ['root'];

function normalizeType(type?: string): NodeType {
  const raw = String(type || 'note').trim().toLowerCase();
  if (raw === 'project') return 'projects';
  return raw as NodeType;
}

function normalizeNode(input: NodeDraft): Node {
  return {
    ...input,
    type: normalizeType(input.type),
    status: input.status || 'published',
    featured: input.featured ?? false,
    children: Array.isArray(input.children) ? input.children : [],
    tags: Array.isArray(input.tags) ? input.tags : [],
    parent: input.parent || null
  };
}

function resolveHashToNode(rawHash: string): string | null {
  if (!rawHash) return null;
  if (nodes[rawHash]) return rawHash;
  if (rawHash.includes('/')) {
    const leaf = rawHash.split('/').filter(Boolean).pop();
    if (leaf && nodes[leaf]) return leaf;
  }
  return null;
}

function buildBreadcrumbPath(id: string): string[] {
  const path: string[] = [];
  let cursor: string | null = id;
  while (cursor && nodes[cursor]) {
    path.unshift(cursor);
    cursor = nodes[cursor].parent;
  }
  return path.length ? path : ['root'];
}

function getTreeRenderOrder(): string[] {
  if (treeOrder.length > 0) return treeOrder;

  const ids = Object.keys(nodes);
  ids.sort((a, b) => {
    const da = Number(nodes[a]?.depth ?? 999);
    const db = Number(nodes[b]?.depth ?? 999);
    if (da !== db) return da - db;
    return String(nodes[a]?.title || a).localeCompare(String(nodes[b]?.title || b));
  });
  return nodes.root ? ['root', ...ids.filter(id => id !== 'root')] : ids;
}

function bindTreeNavigation(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.tree-item').forEach(item => {
    const id = item.dataset.id;
    if (!id) return;
    item.addEventListener('click', () => navigate(id));
  });
}

function buildTree(): void {
  const nav = document.getElementById('tree-nav');
  if (!nav) return;
  nav.innerHTML = renderTreeNav(nodes, getTreeRenderOrder(), activeNode);
  bindTreeNavigation(nav);
}

function bindDetailInteractions(panel: HTMLElement): void {
  panel.querySelectorAll<HTMLButtonElement>('.exp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab as TabType | undefined;
      if (!tab) return;
      activeTab = tab;
      Persistence.updateActiveTab(activeTab);
      renderDetail();
    });
  });

  panel.querySelectorAll<HTMLElement>('.child-card, .back-link, .bc-item').forEach(el => {
    const id = el.dataset.id;
    if (!id || id === activeNode) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => navigate(id));
  });

  panel.querySelectorAll<HTMLAnchorElement>('.node-content a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || !href.endsWith('.md')) return;
    link.addEventListener('click', e => {
      e.preventDefault();
      const nodeId = markdownHrefToNodeId(href);
      if (nodes[nodeId]) navigate(nodeId);
    });
  });
}

function renderDetail(): void {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;
  const node = nodes[activeNode];
  if (!node) return;

  panel.innerHTML = renderDetailPanel({
    node,
    activeTab,
    breadcrumb,
    nodes,
    sanitizeMarkdown: true
  });
  bindDetailInteractions(panel);
}

function handleHashChange(): void {
  const nodeId = resolveHashToNode(location.hash.slice(1));
  if (nodeId && nodeId !== activeNode) {
    navigate(nodeId, { updateHash: false });
  }
}

function navigate(id: string, options: NavigateOptions = {}): void {
  if (!nodes[id]) return;

  activeNode = id;
  if (options.tab) {
    activeTab = options.tab;
    Persistence.updateActiveTab(activeTab);
  }
  breadcrumb = buildBreadcrumbPath(id);
  if (options.updateHash !== false) {
    history.pushState({ node: id }, '', `#${id}`);
  }
  Persistence.updateCurrentNode(id, nodes[id].title);
  window.dispatchEvent(new CustomEvent('explorer:node-change', { detail: { nodeId: id } }));

  const panel = document.getElementById('detail-panel');
  if (!panel) {
    buildTree();
    renderDetail();
    return;
  }

  panel.style.opacity = '0';
  panel.style.transform = 'translateY(6px)';
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';

  window.setTimeout(() => {
    buildTree();
    renderDetail();
    panel.style.opacity = '1';
    panel.style.transform = 'none';
    panel.style.transition = 'opacity 0.26s ease 0.04s, transform 0.26s ease 0.04s';

    if (options.scrollToMap) {
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 160);
}

async function init(): Promise<void> {
  try {
    const response = await fetch('/data/topology.json');
    const topology = (await response.json()) as Topology;
    nodes = Object.fromEntries(
      Object.entries(topology.nodes || {}).map(([id, n]) => [id, normalizeNode(n as NodeDraft)])
    );
    treeOrder = Array.isArray(topology.treeOrder) ? topology.treeOrder : [];
    GraphStore.hydrate(nodes);

    const hashNode = resolveHashToNode(location.hash.slice(1));
    const lastNode = Persistence.getLastNode();
    if (hashNode) {
      activeNode = hashNode;
    } else if (lastNode && nodes[lastNode]) {
      activeNode = lastNode;
    }

    const state = Persistence.load();
    activeTab = (state.activeTab as TabType) || 'explorer';
    breadcrumb = buildBreadcrumbPath(activeNode);

    buildTree();
    renderDetail();
    window.addEventListener('hashchange', handleHashChange);
    console.log(`✓ Topology loaded: ${topology.nodeCount} nodes`);
  } catch (err) {
    console.error('Failed to load topology:', err);
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--t-lo);">
        <p style="margin-bottom:20px;">Failed to load topology data.</p>
        <p style="font-size:11px; color:var(--t-void);">Check that public/data/topology.json exists and build scripts ran successfully.</p>
      </div>
    `;
  }
}

export const Explorer: ExplorerApi = {
  init,
  navigate,
  getActiveNode: () => activeNode,
  getNodes: () => nodes,
  getGraphContracts: () => GraphStore.get()
};

declare global {
  interface Window {
    Explorer: ExplorerApi;
  }
}

window.Explorer = Explorer;
