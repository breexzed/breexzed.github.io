import type { Node } from '@/types/Node';
import { escapeAttr, escapeHtml, resolveMarkdownHrefToSourcePath, sanitizeHtml } from '@/utils/markdown';

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

function renderFolderCard(node: Node): string {
  const typeLabel =
    node.type === 'projects'
      ? 'Project'
      : node.type === 'articulation'
        ? 'Articulation'
        : node.type === 'concept'
          ? 'Concept'
          : toTitleCase(node.type || 'note');
  const visual = node.thumbnail || node.visual || node.images?.[0];
  const links = (node.links || []).slice(0, 3);

  return `
    <div class="project-card panel mid${node.folder ? ' project-card--folder' : ''}" data-node-route="${escapeAttr(node.id)}">
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
        ${
          links.length
            ? `<div class="pc-links">${links
                .map(
                  link =>
                    `<a class="pc-link" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
                )
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderFolderChildren(node: Node, nodes: Record<string, Node>): string {
  if (!node.folder || !node.children?.length) return '';
  const cards = node.children.map(id => nodes[id]).filter(Boolean).map(renderFolderCard).join('');
  if (!cards) return '';

  return `
    <div class="node-folder-contents">
      <div class="node-route-block-label">Notes in this folder</div>
      <div class="projects-grid">${cards}</div>
    </div>
  `;
}

function childrenLabel(node: Node): string {
  if (node.folder) return 'Notes in this folder';
  if (node.type === 'projects') return 'Project contents';
  return 'Trails forward';
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

function resolveInternalNode(currentNode: Node, href: string, nodes: Record<string, Node>): Node | null {
  const sourcePath = resolveMarkdownHrefToSourcePath(currentNode.sourcePath, href);
  if (!sourcePath) return null;
  return Object.values(nodes).find(node => node.sourcePath === sourcePath) || null;
}

function parseLiveUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function renderInlineNodePreviews(content: string, currentNode: Node, nodes: Record<string, Node>): string {
  return content.replace(
    /<a href="([^"]+)"[^>]*>(.*?)<\/a>/g,
    (full, href: string, label: string) => {
      const linkedNode = resolveInternalNode(currentNode, href, nodes);
      if (!linkedNode) {
        const liveUrl = parseLiveUrl(href);
        if (!liveUrl) return full;
        const cleanLabel = label.replace(/<[^>]+>/g, '').trim() || liveUrl.hostname;
        const pathLabel = `${liveUrl.hostname}${liveUrl.pathname === '/' ? '' : liveUrl.pathname}`;
        return `
          <a class="inline-node-preview inline-node-preview--live" href="${escapeAttr(liveUrl.href)}" target="_blank" rel="noopener noreferrer">
            <span class="inline-node-preview-body">
              <span class="inline-node-preview-meta">Live link · ${escapeHtml(liveUrl.hostname)}</span>
              <strong>${escapeHtml(cleanLabel)}</strong>
              <span class="inline-node-preview-desc">${escapeHtml(pathLabel)}</span>
            </span>
            <span class="inline-node-preview-open" aria-hidden="true">↗</span>
          </a>
        `;
      }
      const visual = linkedNode.thumbnail || linkedNode.visual || linkedNode.images?.[0];
      const typeLabel = toTitleCase(linkedNode.type || 'node');
      return `
        <a class="inline-node-preview${visual ? '' : ' inline-node-preview--text'}" href="${escapeAttr(href)}" data-node-route="${escapeAttr(linkedNode.id)}">
          ${visual ? `<img src="${escapeAttr(visual)}" alt="" loading="lazy">` : ''}
          <span class="inline-node-preview-body">
            <span class="inline-node-preview-meta">${escapeHtml(typeLabel)}${linkedNode.domain ? ` · ${escapeHtml(linkedNode.domain)}` : ''}</span>
            <strong>${escapeHtml(label.replace(/<[^>]+>/g, ''))}</strong>
            <span class="inline-node-preview-formula">${escapeHtml(linkedNode.formula || '')}</span>
            <span class="inline-node-preview-desc">${escapeHtml(linkedNode.desc || '')}</span>
          </span>
        </a>
      `;
    }
  );
}

export function renderNodePage({
  node,
  breadcrumb,
  nodes,
  sanitizeMarkdown
}: NodePageParams): string {
  const visual = node.visual || node.thumbnail || (Array.isArray(node.images) ? node.images[0] : null);
  const gallery = node.folder ? [] : Array.isArray(node.images) ? node.images : [];
  const content = node.content
    ? renderInlineNodePreviews(node.content, node, nodes)
    : '<p style="color:var(--t-void); font-style:italic;">No content available.</p>';

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
        <div class="detail-actions node-page-actions">
          <button type="button" class="detail-action-button" data-copy-node-link="true">Copy node link</button>
        </div>
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
          ${renderFolderChildren(node, nodes)}
        </article>

        <aside class="node-page-aside">
          ${node.type !== 'signal' && !node.folder ? renderRelatedCards(childrenLabel(node), node.children || [], nodes) : ''}
        </aside>
      </div>
    </div>
  `;
}
