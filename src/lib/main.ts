import { Cosmos } from './cosmos';
import { Explorer } from './explorer';
import { Persistence } from './persistence';
import { Router } from './router';
import { searchManager } from '@/utils/search';
import { searchUI } from './search-ui';
import type { Node } from '@/types/Node';
import { escapeAttr, escapeHtml } from '@/utils/markdown';
import { graphBootstrap } from './graph-bootstrap';

type CorpusFilter = 'all' | 'projects' | 'concept' | 'articulation';

type LensMapApi = {
  version: string;
  modules: {
    cosmos: typeof Cosmos;
    explorer: typeof Explorer;
    persistence: typeof Persistence;
  };
};

function initCosmos(): void {
  Cosmos.init();
}

function initScrollReveal(): void {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal, .stagger').forEach(el => observer.observe(el));
}

function initMobileNav(): void {
  const nav = document.querySelector('nav');
  const toggle = document.getElementById('nav-toggle') as HTMLButtonElement | null;
  if (!nav || !toggle) return;

  const closeNav = () => {
    nav.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const next = !nav.classList.contains('nav-open');
    nav.classList.toggle('nav-open', next);
    toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
  });

  nav.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  window.addEventListener('route:change', closeNav as EventListener);
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function isPublished(node: Node): boolean {
  return node.id !== 'root' && (node.status || 'published') === 'published';
}

function renderCorpusCard(node: Node): string {
  const typeLabel =
    node.type === 'projects'
      ? 'Project'
      : node.type === 'articulation'
        ? 'Articulation'
        : node.type === 'concept'
          ? 'Concept'
          : toTitleCase(node.type || 'note');

  return `
    <div class="project-card panel mid" data-node="${escapeAttr(node.id)}">
      <div class="pc-content">
        <div class="pc-meta">
          <span class="pc-tag">${escapeHtml(typeLabel)}</span>
          ${node.domain ? `<span class="pc-tag">${escapeHtml(node.domain)}</span>` : ''}
        </div>
        <h3 class="pc-title">${escapeHtml(node.title)}</h3>
        <p class="pc-desc">${escapeHtml(node.desc || '')}</p>
        <div class="pc-formula">${escapeHtml(node.formula || '')}</div>
      </div>
    </div>
  `;
}

function renderSignalCard(node: Node): string {
  const status = node.current_status ? `status: ${node.current_status}` : 'status: untracked';
  return `
    <div class="essay-card panel mid" data-node="${escapeAttr(node.id)}">
      <div class="ec-date">${escapeHtml(node.first_noticed || node.publishDate || node.date || '')}</div>
      <div class="ec-title">${escapeHtml(node.title)}</div>
      <div class="ec-desc">${escapeHtml(status)}${node.domain ? ` • ${escapeHtml(node.domain)}` : ''}</div>
    </div>
  `;
}

function getCorpusFilterMeta(filter: CorpusFilter): { label: string; empty: string } {
  switch (filter) {
    case 'projects':
      return { label: 'Projects', empty: 'No published projects yet.' };
    case 'concept':
      return { label: 'Concepts', empty: 'No concepts have been published yet.' };
    case 'articulation':
      return { label: 'Articulations', empty: 'No articulations have been published yet.' };
    default:
      return { label: 'All', empty: 'No corpus entries have been published yet.' };
  }
}

function getCorpusNodes(allNodes: Node[], filter: CorpusFilter): Node[] {
  const corpusNodes = allNodes
    .filter(node => isPublished(node) && ['projects', 'concept', 'articulation'].includes(node.type))
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return String(a.title).localeCompare(String(b.title));
    });

  if (filter === 'all') return corpusNodes;
  return corpusNodes.filter(node => node.type === filter);
}

function renderCorpusFilters(activeFilter: CorpusFilter): string {
  const filters: CorpusFilter[] = ['all', 'projects', 'concept', 'articulation'];
  return filters
    .map(filter => {
      const meta = getCorpusFilterMeta(filter);
      const active = filter === activeFilter;
      return `
        <button
          type="button"
          class="filter-chip${active ? ' active' : ''}"
          data-corpus-filter="${escapeAttr(filter)}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${escapeHtml(meta.label)}
        </button>
      `;
    })
    .join('');
}

function bindNodeCards(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(card => {
    card.addEventListener('click', event => {
      const target = event.target as Element | null;
      if (target?.closest('.pc-link')) return;
      const nodeId = card.dataset.node;
      if (!nodeId || !Explorer.getNodes()[nodeId]) return;
      Router.navigateToNode(nodeId);
    });
  });
}

function initCorpusViews(): void {
  const allNodes = Object.values(Explorer.getNodes()) as Node[];
  const corpusHost = document.getElementById('corpus-grid');
  const corpusFilters = document.getElementById('corpus-filters');
  const signalsHost = document.getElementById('signals-list');
  const projectsHost = document.getElementById('projects-grid');
  const publishedProjects = allNodes
    .filter(node => isPublished(node) && node.type === 'projects')
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return String(a.title).localeCompare(String(b.title));
    });
  const signalNodes = allNodes
    .filter(node => isPublished(node) && (node.type === 'signal' || node.type === 'trail'))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
  let activeCorpusFilter: CorpusFilter = 'all';

  const renderCorpusSurface = () => {
    if (corpusFilters) {
      corpusFilters.innerHTML = renderCorpusFilters(activeCorpusFilter);
      corpusFilters.querySelectorAll<HTMLButtonElement>('[data-corpus-filter]').forEach(button => {
        button.addEventListener('click', () => {
          const next = button.dataset.corpusFilter as CorpusFilter | undefined;
          if (!next || next === activeCorpusFilter) return;
          activeCorpusFilter = next;
          renderCorpusSurface();
        });
      });
    }

    if (!corpusHost) return;
    const corpusNodes = getCorpusNodes(allNodes, activeCorpusFilter);
    const meta = getCorpusFilterMeta(activeCorpusFilter);
    corpusHost.innerHTML = corpusNodes.length
      ? `<div class="projects-grid">${corpusNodes.map(renderCorpusCard).join('')}</div>`
      : `<div class="empty-panel panel mid">${escapeHtml(meta.empty)}</div>`;

    bindNodeCards('#corpus-grid .project-card[data-node]');
  };

  renderCorpusSurface();

  if (signalsHost) {
    signalsHost.innerHTML = signalNodes.length
      ? `<div class="essays-list">${signalNodes.map(renderSignalCard).join('')}</div>`
      : '<div class="empty-panel panel mid">No published signals or trails yet.</div>';
  }

  if (projectsHost) {
    projectsHost.innerHTML = publishedProjects.length
      ? `<div class="projects-grid">${publishedProjects.map(renderCorpusCard).join('')}</div>`
      : '<div class="empty-panel panel mid">No published projects yet.</div>';
  }

  bindNodeCards('#signals-list .essay-card[data-node]');
  bindNodeCards('#projects-grid .project-card[data-node]');
}

async function initExplorer(): Promise<void> {
  await Explorer.init();
}

async function init(): Promise<void> {
  console.log('◈ BREEXZED estate initializing...');

  initCosmos();
  initMobileNav();
  initScrollReveal();
  await initExplorer();
  Router.init();
  initCorpusViews();
  await searchManager.init(Explorer.getNodes() as Record<string, Node>);
  searchUI.init();
  await graphBootstrap.init();

  console.log('✓ BREEXZED estate ready');
}

declare global {
  interface Window {
    LensMap: LensMapApi;
  }
}

window.LensMap = {
  version: '2.0-phase6',
  modules: {
    cosmos: Cosmos,
    explorer: Explorer,
    persistence: Persistence
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}
