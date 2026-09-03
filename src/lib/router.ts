import { Explorer } from './explorer';

type RouteKey = 'home' | 'map' | 'corpus' | 'signals' | 'projects' | 'whoami' | 'node';

const ALL_SECTIONS = ['home', 'corpus', 'map', 'signals', 'projects', 'whoami', 'node-page'];
const HOME_SECTIONS = ['home', 'corpus', 'map', 'signals', 'projects'];

const ROUTE_SECTIONS: Record<RouteKey, string[]> = {
  home: HOME_SECTIONS,
  map: ['map'],
  corpus: ['corpus'],
  signals: ['signals'],
  projects: ['projects'],
  whoami: ['whoami'],
  node: ['node-page']
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return host.includes('github.io');
}

function toHistoryPath(pathname: string): string {
  const next = normalizePath(pathname);
  if (isStaticHost() && next !== '/') {
    return `#${next}`;
  }
  return next;
}

function parseRoute(pathname: string): { key: RouteKey; nodeId?: string } {
  const path = normalizePath(pathname);
  if (path === '/') return { key: 'home' };
  if (path === '/map') return { key: 'corpus' };
  if (path === '/corpus') return { key: 'corpus' };
  if (path === '/signals') return { key: 'signals' };
  if (path === '/projects') return { key: 'projects' };
  if (path === '/whoami') return { key: 'whoami' };  // Legacy aliases preserved for old links.
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
  const navPath = normalized.startsWith('/node/') ? '' : normalized;
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
    Explorer.navigate(route.nodeId, { scrollToMap: false, updateHash: false });
  }
}

function hashToPath(hash: string): string | null {
  const value = hash.replace(/^#/, '').trim();
  if (!value) return null;
  if (value.startsWith('/')) {
    const path = normalizePath(value);
    if (path === '/map') return '/corpus';
    if (path === '/corpus' || path === '/concepts' || path === '/principles') return '/corpus';
    if (path === '/signals' || path === '/essays') return '/signals';
    if (path === '/projects' || path === '/stack') return '/projects';
    if (path === '/whoami' || path === '/about') return '/whoami';
    if (path.startsWith('/node/')) {
      const nodeId = decodeURIComponent(path.slice('/node/'.length));
      return Explorer.getNodes()[nodeId] ? `/node/${encodeURIComponent(nodeId)}` : null;
    }
    const leaf = path.split('/').filter(Boolean).pop();
    if (leaf && Explorer.getNodes()[leaf]) {
      return `/node/${encodeURIComponent(leaf)}`;
    }
    return null;
  }

  if (value === 'map') return '/corpus';
  if (value === 'corpus' || value === 'concepts' || value === 'principles') return '/corpus';
  if (value === 'signals' || value === 'essays') return '/signals';
  if (value === 'projects' || value === 'stack') return '/projects';
  if (value === 'whoami' || value === 'about') return '/whoami';

  const directId = Explorer.getNodes()[value] ? value : null;
  if (directId) return `/node/${encodeURIComponent(directId)}`;

  const leaf = value.split('/').filter(Boolean).pop();
  if (leaf && Explorer.getNodes()[leaf]) {
    return `/node/${encodeURIComponent(leaf)}`;
  }
  return null;
}

function getBasePath(): string {
  const pathname = window.location.pathname || '/';
  const trimmed = pathname.replace(/index\.html$/i, '').replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed;
}

function getPreferredNodePath(nodeId: string): string {
  const encodedId = encodeURIComponent(nodeId);
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isLocalDev = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  const base = getBasePath();

  if (isGitHubPages || (!isLocalDev && !window.location.pathname.startsWith('/node/'))) {
    return `${base}/#/node/${encodedId}`;
  }

  return `${base}/node/${encodedId}`;
}

function getPreferredNodeUrl(nodeId: string): string {
  const origin = window.location.origin || 'https://example.com';
  const path = getPreferredNodePath(nodeId);
  return `${origin}${path}`;
}

async function copyNodeLink(nodeId: string): Promise<boolean> {
  const url = getPreferredNodeUrl(nodeId);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    const helper = document.createElement('textarea');
    helper.value = url;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(helper);
    return copied;
  } catch (error) {
    console.warn('Failed to copy node link', error);
    return false;
  }
}

function getResolvedPath(): string {
  const hashRoute = hashToPath(location.hash);
  if (hashRoute) return hashRoute;
  return normalizePath(location.pathname);
}

function navigate(pathname: string): void {
  const next = normalizePath(pathname);
  const historyPath = toHistoryPath(next);
  const currentPath = normalizePath(location.pathname);
  const currentHash = location.hash;

  if (currentHash && currentHash.startsWith('#')) {
    if (normalizePath(currentPath) === next) {
      applyRoute(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  if (currentPath !== next || (currentHash && currentHash.startsWith('#') && historyPath !== currentHash)) {
    history.pushState({}, '', historyPath);
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

  const initialRoute = getResolvedPath();
  if (initialRoute !== normalizePath(location.pathname)) {
    const nextLocation = isStaticHost() ? `#${initialRoute}` : initialRoute;
    history.replaceState({}, '', nextLocation);
  }

  applyRoute(initialRoute);

  window.addEventListener('popstate', () => {
    applyRoute(getResolvedPath());
  });

  window.addEventListener('hashchange', () => {
    applyRoute(getResolvedPath());
  });
}

export const Router = {
  init,
  navigate,
  navigateToNode,
  getPreferredNodeUrl,
  copyNodeLink
};
