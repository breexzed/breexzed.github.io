import type { Node } from '@/types/Node';
import { escapeAttr, escapeHtml, sanitizeHtml } from '@/utils/markdown';

type NodePageParams = {
  node: Node;
  breadcrumb: string[];
  nodes: Record<string, Node>;
  sanitizeMarkdown: boolean;
};

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateLabel(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function computeSignalGap(node: Node): string | null {
  if (!node.first_noticed || !node.date_of_discovery) return null;
  const start = new Date(node.first_noticed).getTime();
  const end = new Date(node.date_of_discovery).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Same-day confirmation';
  if (diffDays === 1) return '1 day to confirmation';
  return `${diffDays} days to confirmation`;
}

function renderMetaRow(label: string, value: string): string {
  return `
    <div class="detail-meta-row">
      <span class="detail-meta-label">${escapeHtml(label)}</span>
      <span class="detail-meta-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function renderTypeSemantics(node: Node, nodes: Record<string, Node>): string {
  const trails =
    (node.connects || [])
      .map(id => nodes[id])
      .filter(candidate => candidate && candidate.type === 'trail')
      .map(candidate => candidate.title)
      .filter(Boolean) || [];
  const linkedArticulations =
    (node.connects || [])
      .map(id => nodes[id])
      .filter(candidate => candidate && candidate.type === 'articulation')
      .map(candidate => candidate.title)
      .filter(Boolean) || [];
  const linkedSignals =
    (node.connects || [])
      .map(id => nodes[id])
      .filter(candidate => candidate && candidate.type === 'signal')
      .map(candidate => candidate.title)
      .filter(Boolean) || [];
  const linkedConcepts =
    (node.connects || [])
      .map(id => nodes[id])
      .filter(candidate => candidate && candidate.type === 'concept')
      .map(candidate => candidate.title)
      .filter(Boolean) || [];

  const rows: string[] = [];
  const status = node.current_status ? toTitleCase(node.current_status) : null;
  const signalGap = computeSignalGap(node);

  if (node.type === 'signal') {
    if (node.first_noticed) rows.push(renderMetaRow('First noticed', formatDateLabel(node.first_noticed) || node.first_noticed));
    if (status) rows.push(renderMetaRow('Current status', status));
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (trails.length) rows.push(renderMetaRow('Linked trails', trails.join(' • ')));
    if (signalGap) rows.push(renderMetaRow('Trajectory', signalGap));
  } else if (node.type === 'trail') {
    if (node.source) rows.push(renderMetaRow('Source', node.source));
    if (node.date_of_discovery) rows.push(renderMetaRow('Date of discovery', formatDateLabel(node.date_of_discovery) || node.date_of_discovery));
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (linkedConcepts.length) rows.push(renderMetaRow('Concept link', linkedConcepts.join(' • ')));
  } else if (node.type === 'concept') {
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (linkedArticulations.length) rows.push(renderMetaRow('Articulations', linkedArticulations.join(' • ')));
    if (linkedSignals.length) rows.push(renderMetaRow('Signals', linkedSignals.join(' • ')));
    if (trails.length) rows.push(renderMetaRow('Trails', trails.join(' • ')));
  } else if (node.type === 'articulation') {
    if (node.source) rows.push(renderMetaRow('Reference', node.source));
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (linkedConcepts.length) rows.push(renderMetaRow('Concept anchor', linkedConcepts.join(' • ')));
    if (linkedSignals.length) rows.push(renderMetaRow('Live signals', linkedSignals.join(' • ')));
  } else if (node.type === 'projects') {
    if (node.publishDate || node.date) rows.push(renderMetaRow('Published', formatDateLabel(node.publishDate || node.date) || ''));
    if (node.externalUrl) rows.push(renderMetaRow('External', node.externalUrl));
  }

  if (!rows.length) return '';
  return `<div class="detail-meta node-page-meta">${rows.join('')}</div>`;
}

function renderRelatedCards(title: string, ids: string[], nodes: Record<string, Node>): string {
  const cards = ids
    .map(id => nodes[id])
    .filter(Boolean)
    .map(related => {
      return `
        <button type="button" class="node-route-card panel mid" data-node-route="${escapeAttr(related.id)}">
          <span class="node-route-card-type">${escapeHtml(toTitleCase(related.type || 'node'))}</span>
          <span class="node-route-card-title">${escapeHtml(related.title)}</span>
          <span class="node-route-card-formula">${escapeHtml(related.formula || '')}</span>
        </button>
      `;
    })
    .join('');

  if (!cards) return '';

  return `
    <div class="node-route-block">
      <div class="node-route-block-label">${escapeHtml(title)}</div>
      <div class="node-route-cards">${cards}</div>
    </div>
  `;
}

function renderBreadcrumb(breadcrumb: string[], activeNode: string, nodes: Record<string, Node>): string {
  return `
    <div class="breadcrumb">
      ${breadcrumb
        .map((id, index) => {
          const isCurrent = id === activeNode;
          return `
            <span class="bc-item ${isCurrent ? 'current' : ''}" data-id="${escapeAttr(id)}">
              ${escapeHtml(nodes[id]?.title || id)}
            </span>
            ${index < breadcrumb.length - 1 ? '<span class="bc-sep">›</span>' : ''}
          `;
        })
        .join('')}
    </div>
  `;
}

function renderNodeLinkList(node: Node): string {
  if (!Array.isArray(node.links) || node.links.length === 0) return '';
  return `
    <div class="node-page-links">
      ${node.links
        .slice(0, 4)
        .map(link => `
          <a class="pc-link" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(link.label)}
          </a>
        `)
        .join('')}
    </div>
  `;
}

export function renderNodePage({
  node,
  breadcrumb,
  nodes,
  sanitizeMarkdown
}: NodePageParams): string {
  const visual = node.visual || node.thumbnail || (Array.isArray(node.images) ? node.images[0] : null);
  const gallery = Array.isArray(node.images) ? node.images : [];
  const content = node.content || '<p style="color:var(--t-void); font-style:italic;">No content available.</p>';

  return `
    <div class="node-page-shell">
      <div class="node-page-top">
        ${renderBreadcrumb(breadcrumb, node.id, nodes)}
      </div>

      <div class="node-page-hero panel deep">
        <div class="node-page-kicker">
          <span class="pc-tag">${escapeHtml(node.type === 'root' ? 'Root' : toTitleCase(node.type || 'Node'))}</span>
          ${node.domain ? `<span class="pc-tag">${escapeHtml(node.domain)}</span>` : ''}
        </div>
        <div class="detail-label">${escapeHtml(node.label)}</div>
        <h1 class="node-page-title">${escapeHtml(node.title)}</h1>
        <p class="node-page-formula">${escapeHtml(node.formula)}</p>
        <p class="node-page-desc">${escapeHtml(node.desc || '')}</p>
        ${renderNodeLinkList(node)}
      </div>

      ${visual ? `<figure class="node-page-visual panel deep"><img src="${escapeAttr(visual)}" alt="${escapeAttr(node.title)}"></figure>` : ''}
      ${gallery.length > 1 ? `
        <div class="node-page-gallery panel shallow">
          ${gallery
            .slice(1)
            .map(src => `<img src="${escapeAttr(src)}" alt="${escapeAttr(node.title)}" loading="lazy">`)
            .join('')}
        </div>
      ` : ''}

      <div class="node-page-grid">
        <article class="node-page-article panel shallow">
          ${renderTypeSemantics(node, nodes)}
          <div class="node-content node-page-content">
            ${sanitizeMarkdown ? sanitizeHtml(content) : content}
          </div>
        </article>

        <aside class="node-page-aside">
          ${node.type !== 'signal' ? renderRelatedCards('Trails forward', node.children || [], nodes) : ''}
        </aside>
      </div>
    </div>
  `;
}
