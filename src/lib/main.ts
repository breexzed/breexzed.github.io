import { Cosmos } from './cosmos';
import { Explorer } from './explorer';
import { Persistence } from './persistence';
import { Router } from './router';
import { searchManager } from '@/utils/search';
import { searchUI } from './search-ui';
import type { Node } from '@/types/Node';
import { escapeAttr, escapeHtml } from '@/utils/markdown';
import { siteConfig } from '@/config/site';
import '../../css/owlcyon.css';

type CorpusFilter = 'all' | 'folder' | 'projects' | 'concept' | 'articulation';

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

function renderFooterSocials(): void {
  const host = document.getElementById('footer-socials');
  if (!host) return;

  const icons: Record<string, string> = {
    github:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.79.5 12.31c0 5.22 3.3 9.64 7.87 11.2.58.11.79-.26.79-.57 0-.28-.01-1.2-.02-2.17-3.2.71-3.88-1.58-3.88-1.58-.52-1.37-1.28-1.73-1.28-1.73-1.04-.73.08-.71.08-.71 1.15.08 1.75 1.22 1.75 1.22 1.02 1.82 2.68 1.29 3.34.99.1-.76.4-1.29.73-1.58-2.55-.3-5.23-1.32-5.23-5.88 0-1.3.45-2.36 1.19-3.19-.12-.3-.52-1.52.11-3.17 0 0 .98-.32 3.2 1.22a10.8 10.8 0 0 1 5.83 0c2.22-1.54 3.2-1.22 3.2-1.22.63 1.65.23 2.87.11 3.17.74.83 1.19 1.89 1.19 3.19 0 4.57-2.69 5.57-5.25 5.87.41.36.78 1.08.78 2.19 0 1.58-.01 2.85-.01 3.24 0 .31.21.69.8.57 4.56-1.56 7.85-5.98 7.85-11.19C23.5 5.79 18.35.5 12 .5Z"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.75A2.75 2.75 0 0 1 4.75 3h14.5A2.75 2.75 0 0 1 22 5.75v12.5A2.75 2.75 0 0 1 19.25 21H4.75A2.75 2.75 0 0 1 2 18.25V5.75Zm2.2-.25L12 11.35l7.8-5.85H4.2Zm15.3 1.9-6.9 5.18a1 1 0 0 1-1.2 0L4.5 7.4v10.85c0 .14.11.25.25.25h14.5c.14 0 .25-.11.25-.25V7.4Z"/></svg>',
    x:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.76 7.73L23.2 22h-6.23l-4.88-7.18L5.8 22H2.7l7.23-8.27L.8 2h6.39l4.41 6.57L18.9 2Zm-1.09 18h1.72L6.27 3.9H4.42L17.81 20Z"/></svg>',
    spotify:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.82 15.14a.66.66 0 0 1-.9.22c-2.46-1.5-5.56-1.84-9.2-1.02a.66.66 0 0 1-.29-1.29c3.99-.9 7.42-.51 10.17 1.17.31.19.41.6.22.92Zm1.29-2.86a.82.82 0 0 1-1.12.28c-2.82-1.73-7.11-2.23-10.44-1.21a.82.82 0 0 1-.48-1.56c3.81-1.16 8.56-.6 11.78 1.37.39.24.5.74.26 1.12Zm.11-2.98c-3.38-2.01-8.95-2.19-12.18-1.21a.99.99 0 1 1-.58-1.9c3.71-1.13 9.88-.91 13.77 1.4a.99.99 0 1 1-1.01 1.71Z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 7.17a3 3 0 0 0-2.11-2.12C19.55 4.5 12 4.5 12 4.5s-7.55 0-9.39.55A3 3 0 0 0 .5 7.17 31.84 31.84 0 0 0 0 12a31.84 31.84 0 0 0 .5 4.83 3 3 0 0 0 2.11 2.12c1.84.55 9.39.55 9.39.55s7.55 0 9.39-.55a3 3 0 0 0 2.11-2.12A31.84 31.84 0 0 0 24 12a31.84 31.84 0 0 0-.5-4.83ZM9.6 15.01V8.99L15.82 12 9.6 15.01Z"/></svg>'
  };

  const entries = Object.entries(siteConfig.social).filter(([, value]) => Boolean(value));
  host.innerHTML = entries
    .map(([key, value]) => {
      const label = key === 'x' ? 'X' : key.charAt(0).toUpperCase() + key.slice(1);
      return `
        <a class="social-link" href="${escapeAttr(value as string)}" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">
          ${icons[key] || ''}
        </a>
      `;
    })
    .join('');
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

function getNodePreviewImage(node: Node): string | null {
  if (node.thumbnail) return node.thumbnail;
  if (node.visual) return node.visual;
  if (Array.isArray(node.images) && node.images.length > 0) return node.images[0];
  return null;
}

function renderNodeLinks(node: Node): string {
  if (!Array.isArray(node.links) || node.links.length === 0) return '';
  const links = node.links.slice(0, 3);
  return `
    <div class="pc-links">
      ${links
        .map(link => `
          <a class="pc-link" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(link.label)}
          </a>
        `)
        .join('')}
    </div>
  `;
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
  const visual = getNodePreviewImage(node);

  return `
    <div class="project-card panel mid${node.folder ? ' project-card--folder' : ''}" data-node="${escapeAttr(node.id)}">
      ${visual ? `<div class="pc-visual"><img src="${escapeAttr(visual)}" alt="${escapeAttr(node.title)}"></div>` : ''}
      <div class="pc-content">
        <div class="pc-meta">
          <span class="pc-tag">${escapeHtml(typeLabel)}</span>
          ${node.folder ? '<span class="pc-tag pc-folder-tag">Folder</span>' : ''}
          ${node.domain ? `<span class="pc-tag">${escapeHtml(node.domain)}</span>` : ''}
        </div>
        <h3 class="pc-title">${escapeHtml(node.title)}</h3>
        <p class="pc-desc">${escapeHtml(node.desc || '')}</p>
        <div class="pc-formula">${escapeHtml(node.formula || '')}</div>
        ${renderNodeLinks(node)}
      </div>
    </div>
  `;
}

function renderSignalCard(node: Node): string {
  const status = node.current_status ? `status: ${node.current_status}` : 'status: untracked';
  const visual = getNodePreviewImage(node);
  return `
    <div class="essay-card panel mid" data-node="${escapeAttr(node.id)}">
      ${visual ? `<div class="ec-visual"><img src="${escapeAttr(visual)}" alt="${escapeAttr(node.title)}"></div>` : ''}
      <div class="ec-body">
        <div class="ec-date">${escapeHtml(node.first_noticed || node.publishDate || node.date || '')}</div>
        <div class="ec-title">${escapeHtml(node.title)}</div>
        <div class="ec-desc">${escapeHtml(status)}${node.domain ? ` • ${escapeHtml(node.domain)}` : ''}</div>
      </div>
    </div>
  `;
}

function getCorpusFilterMeta(filter: CorpusFilter): { label: string; empty: string } {
  switch (filter) {
    case 'folder':
      return { label: 'Folders', empty: 'No folders have been published yet.' };
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
    .filter(
      node =>
        isPublished(node) &&
        (!node.parent || node.parent === 'root') &&
        ['projects', 'concept', 'articulation'].includes(node.type)
    )
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return String(a.title).localeCompare(String(b.title));
    });

  if (filter === 'all') return corpusNodes;
  if (filter === 'folder') return corpusNodes.filter(node => node.folder);
  return corpusNodes.filter(node => node.type === filter);
}

function renderCorpusFilters(activeFilter: CorpusFilter): string {
  const filters: CorpusFilter[] = ['all', 'folder', 'projects', 'concept', 'articulation'];
  return filters
    .map(filter => {
      const meta = getCorpusFilterMeta(filter);
      const active = filter === activeFilter;
      return `
        ${filter === 'folder' ? '<span class="filter-separator" aria-hidden="true"></span>' : ''}
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
    .filter(node => isPublished(node) && (!node.parent || node.parent === 'root') && node.type === 'projects')
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
  renderFooterSocials();
  const searchInit = searchManager.init(Explorer.getNodes() as Record<string, Node>);
  await searchInit;
  searchUI.init();

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
