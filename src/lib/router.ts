import { Explorer } from './explorer';

type RouteKey = 'home' | 'map' | 'corpus' | 'signals' | 'projects' | 'node';

const ALL_SECTIONS = ['home', 'corpus', 'map', 'signals', 'projects'];

const ROUTE_SECTIONS: Record<RouteKey, string[]> = {
  home: ALL_SECTIONS,
  map: ['map'],
  corpus: ['corpus'],
  signals: ['signals'],
  projects: ['projects'],
  node: ['map']
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function parseRoute(pathname: string): { key: RouteKey; nodeId?: string } {
  const path = normalizePath(pathname);
  if (path === '/') return { key: 'home' };
  if (path === '/map') return { key: 'map' };
  if (path === '/corpus') return { key: 'corpus' };
  if (path === '/signals') return { key: 'signals' };
  if (path === '/projects') return { key: 'projects' };
  // Legacy aliases preserved for old links.
  if (path === '/writing') return { key: 'signals' };
  if (path === '/concepts' || path === '/logic') return { key: 'corpus' };
  if (path === '/stack') return { key: 'projects' };
  if (path.startsWith('/node/')) {
    const nodeId = decodeURIComponent(path.slice('/node/'.length));
    return { key: 'node', nodeId };
  }
  return { key: 'home' };
}

function setSectionVisibility(ids: string[]): void {
  const visible = new Set(ids);
  ALL_SECTIONS.forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.toggle('route-hidden', !visible.has(id));
  });
}

function setActiveNav(pathname: string): void {
  const normalized = normalizePath(pathname);
  const navPath = normalized.startsWith('/node/') ? '/map' : normalized;
  document.querySelectorAll<HTMLAnchorElement>('nav .nav-links a[data-route]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const active = href === navPath;
    link.classList.toggle('active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function animateVisibleSections(ids: string[]): void {
  ids.forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.remove('route-enter');
    section.classList.add('route-anim');
    window.requestAnimationFrame(() => {
      section.classList.add('route-enter');
    });
  });
}

function applyRoute(pathname: string): void {
  const route = parseRoute(pathname);
  document.body.dataset.route = route.key;
  setSectionVisibility(ROUTE_SECTIONS[route.key]);
  setActiveNav(normalizePath(pathname));
  animateVisibleSections(ROUTE_SECTIONS[route.key]);
  window.dispatchEvent(new CustomEvent('route:change', { detail: route }));

  if (route.key === 'node' && route.nodeId && Explorer.getNodes()[route.nodeId]) {
    Explorer.navigate(route.nodeId, { tab: 'content', scrollToMap: false, updateHash: false });
    document.getElementById('map')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
}

function hashToPath(hash: string): string | null {
  const value = hash.replace(/^#/, '').trim();
  if (!value) return null;
  if (value === 'map') return '/map';
  if (value === 'corpus' || value === 'concepts' || value === 'principles') return '/corpus';
  if (value === 'signals' || value === 'essays') return '/signals';
  if (value === 'projects' || value === 'stack') return '/projects';

  const directId = Explorer.getNodes()[value] ? value : null;
  if (directId) return `/node/${encodeURIComponent(directId)}`;

  const leaf = value.split('/').filter(Boolean).pop();
  if (leaf && Explorer.getNodes()[leaf]) {
    return `/node/${encodeURIComponent(leaf)}`;
  }
  return null;
}

function navigate(pathname: string): void {
  const next = normalizePath(pathname);
  if (normalizePath(location.pathname) !== next) {
    history.pushState({}, '', next);
  }
  applyRoute(next);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToNode(nodeId: string): void {
  if (!Explorer.getNodes()[nodeId]) return;
  navigate(`/node/${encodeURIComponent(nodeId)}`);
}

function interceptNavLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href) return;
      event.preventDefault();
      navigate(href);
    });
  });
}

function init(): void {
  interceptNavLinks();

  const hashPath = hashToPath(location.hash);
  if (hashPath) {
    history.replaceState({}, '', hashPath);
  }

  applyRoute(location.pathname);

  window.addEventListener('popstate', () => {
    applyRoute(location.pathname);
  });
}

export const Router = {
  init,
  navigate,
  navigateToNode
};
