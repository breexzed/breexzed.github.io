#!/usr/bin/env node

// Runs after `vite build`. The app is one HTML shell that JS fills in, so to a
// crawler or link-preview bot every route was the homepage. This writes a real
// HTML file per route (own title, description, canonical, og/twitter tags, and
// the node's content in the page), plus sitemap.xml and robots.txt.
// Vercel serves a matching file before its SPA rewrite, and `cleanUrls` maps
// /node/<id> to node/<id>.html.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const TOPOLOGY_FILE = path.join(ROOT_DIR, 'public', 'data', 'topology.json');
const ORIGIN = 'https://www.breexzed.me';
const SITE_NAME = 'BREEXZED';
const DESC_MAX = 160;

// Mirrors ROUTE_SECTIONS in src/lib/router.ts: which <section> ids each route shows.
const ALL_SECTIONS = ['home', 'corpus', 'signals', 'projects', 'whoami', 'node-page', 'not-found'];
const STATIC_ROUTES = [
  { path: '/corpus', section: 'corpus' },
  { path: '/signals', section: 'signals' },
  { path: '/projects', section: 'projects' },
  { path: '/whoami', section: 'whoami' }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToText(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = DESC_MAX) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:—-]+$/, '')}…`;
}

// Replace exactly one match, so a template change fails the build instead of
// silently shipping a page with the homepage's tags.
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(new RegExp(pattern.source, 'g')) || [];
  if (matches.length !== 1) {
    throw new Error(`prerender: expected 1 match for ${label}, found ${matches.length}`);
  }
  return html.replace(pattern, replacement);
}

function setMeta(html, { title, description, url, type }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`, '<title>');
  html = replaceOnce(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`, 'meta description');
  html = replaceOnce(html, /<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${type}">`, 'og:type');
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`, 'og:title');
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`, 'og:description');
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`, 'og:url');
  html = replaceOnce(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`, 'twitter:title');
  html = replaceOnce(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`, 'twitter:description');
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`, 'canonical');
  return html;
}

// Show only this route's section before JS runs, so crawlers read the right
// content as visible text and there is no flash of the homepage.
function showOnly(html, visibleId) {
  ALL_SECTIONS.forEach(id => {
    html = replaceOnce(
      html,
      new RegExp(`<section id="${id}" class="([^"]*)"`),
      (_, classes) => {
        const list = classes.split(/\s+/).filter(c => c && c !== 'route-hidden');
        if (id !== visibleId) list.push('route-hidden');
        return `<section id="${id}" class="${list.join(' ')}"`;
      },
      `section#${id}`
    );
  });
  return html;
}

function sectionText(html, id, selector) {
  const section = html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`));
  if (!section) return '';
  const el = section[1].match(new RegExp(`<p class="${selector}">([\\s\\S]*?)</p>`)) ||
    section[1].match(/<p>([\s\S]*?)<\/p>/);
  return el ? htmlToText(el[1]) : '';
}

// Same data-title the router uses for document.title on client-side navigation.
function sectionTitle(html, id) {
  const match = html.match(new RegExp(`<section id="${id}"[^>]*data-title="([^"]*)"`));
  if (!match) throw new Error(`prerender: section#${id} has no data-title`);
  return match[1];
}

// The client replaces #node-page-shell with its full render, so this only has
// to carry the content in the same classes.
function renderNodeShell(node) {
  return `<div id="node-page-shell">
      <div class="node-page-shell">
        <div class="node-page-hero panel deep">
          <h1 class="node-page-title">${escapeHtml(node.title)}</h1>
          ${node.formula ? `<p class="node-page-formula">${escapeHtml(node.formula)}</p>` : ''}
          ${node.desc ? `<p class="node-page-desc">${escapeHtml(node.desc)}</p>` : ''}
        </div>
        <article class="node-page-article panel deep">
          <div class="node-content node-page-content">${node.content || ''}</div>
        </article>
      </div>
    </div>`;
}

function writePage(routePath, html) {
  const file = path.join(DIST_DIR, `${routePath.replace(/^\//, '')}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`✓ ${routePath} -> ${path.relative(ROOT_DIR, file)}`);
}

function main() {
  const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  const topology = JSON.parse(fs.readFileSync(TOPOLOGY_FILE, 'utf8'));
  const nodes = Object.values(topology.nodes || {}).filter(
    node => node.status === 'published' && node.type !== 'root'
  );
  const urls = [`${ORIGIN}/`, `${ORIGIN}/portfolio`];

  STATIC_ROUTES.forEach(route => {
    const url = `${ORIGIN}${route.path}`;
    const description = truncate(sectionText(template, route.section, 'section-copy'));
    let html = setMeta(template, {
      title: `${sectionTitle(template, route.section)} — ${SITE_NAME}`,
      description,
      url,
      type: 'website'
    });
    html = showOnly(html, route.section);
    writePage(route.path, html);
    urls.push(url);
  });

  nodes.forEach(node => {
    const routePath = `/node/${node.id}`;
    const url = `${ORIGIN}${routePath}`;
    const description = truncate(node.desc || htmlToText(node.content || '') || node.title);
    let html = setMeta(template, {
      title: `${node.title} — ${SITE_NAME}`,
      description,
      url,
      type: 'article'
    });
    html = showOnly(html, 'node-page');
    html = replaceOnce(html, /<div id="node-page-shell"><\/div>/, renderNodeShell(node), '#node-page-shell');
    writePage(routePath, html);
    urls.push(url);
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  console.log(`✓ sitemap.xml (${urls.length} urls), robots.txt`);
}

main();
