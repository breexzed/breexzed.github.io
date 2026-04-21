import type { Node, TabType } from '@/types/Node';
import { escapeAttr, escapeHtml, sanitizeHtml } from '@/utils/markdown';

type DetailPanelParams = {
  node: Node;
  activeTab: TabType;
  breadcrumb: string[];
  nodes: Record<string, Node>;
  sanitizeMarkdown: boolean;
};

function renderTabs(activeTab: TabType): string {
  return `
    <div class="exp-tabs">
      <button class="exp-tab ${activeTab === 'explorer' ? 'active' : ''}" data-tab="explorer">Explorer</button>
      <button class="exp-tab ${activeTab === 'content' ? 'active' : ''}" data-tab="content">Content</button>
      <button class="exp-tab ${activeTab === 'diagram' ? 'active' : ''}" data-tab="diagram">Diagram</button>
    </div>
  `;
}

function renderBreadcrumb(breadcrumb: string[], activeNode: string, nodes: Record<string, Node>): string {
  return `
    <div class="breadcrumb">
      ${breadcrumb
        .map((id, i) => {
          const isCurrent = id === activeNode;
          return `
            <span class="bc-item ${isCurrent ? 'current' : ''}" data-id="${escapeAttr(id)}">
              ${escapeHtml(nodes[id]?.title || id)}
            </span>
            ${i < breadcrumb.length - 1 ? '<span class="bc-sep">›</span>' : ''}
          `;
        })
        .join('')}
    </div>
  `;
}

function generateNodeDiagram(node: Node, nodes: Record<string, Node>): string {
  let output = `<span class="a-d">Viewing: ${escapeHtml(node.title)}</span>\n\n`;
  if (node.parent) {
    const parent = nodes[node.parent];
    output += `  <span class="a-d">↑ ${escapeHtml(parent ? parent.title : node.parent)}</span>\n`;
    output += `  <span class="a-d">│</span>\n`;
  }
  output += `  <span class="a-n">┌─────────────────────────────────┐</span>\n`;
  output += `  <span class="a-f">│   ${escapeHtml(node.formula).padEnd(29)} │</span>\n`;
  output += `  <span class="a-n">│                                 │</span>\n`;
  output += `  <span class="a-f">│   ${escapeHtml(node.title).padEnd(29)} │</span>\n`;
  output += `  <span class="a-n">└─────────────────────────────────┘</span>\n`;

  if (node.children?.length) {
    output += `  <span class="a-d">│</span>\n`;
    node.children.forEach((cid, i) => {
      const child = nodes[cid];
      if (!child) return;
      const isLast = i === node.children.length - 1;
      output += `  <span class="a-d">${isLast ? '└' : '├'}─ ${escapeHtml(child.title)}</span>\n`;
    });
  }

  return output;
}

function renderExplorerTab(node: Node, nodes: Record<string, Node>): string {
  const childrenHTML =
    node.children && node.children.length
      ? `
    <div class="detail-children">
      <div class="detail-children-label">Connected Nodes</div>
      ${node.children
        .map(cid => {
          const child = nodes[cid];
          if (!child) return '';
          return `
            <div class="child-card" data-id="${escapeAttr(cid)}">
              <div>
                <div class="cc-name">${escapeHtml(child.title)}</div>
                <div class="cc-sub">${escapeHtml(child.formula)}</div>
              </div>
              <span class="cc-arrow">→</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `
      : '';

  const connectedHTML =
    node.connects && node.connects.length
      ? `
    <div class="detail-children">
      <div class="detail-children-label">Cross-Links</div>
      ${node.connects
        .map(cid => {
          const child = nodes[cid];
          if (!child) return '';
          return `
            <div class="child-card" data-id="${escapeAttr(cid)}">
              <div>
                <div class="cc-name">${escapeHtml(child.title)}</div>
                <div class="cc-sub">${escapeHtml(toTitleCase(child.type || 'note'))}</div>
              </div>
              <span class="cc-arrow">→</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `
      : '';

  const parentHTML =
    node.parent && nodes[node.parent]
      ? `<span class="back-link" data-id="${escapeAttr(node.parent)}">← Back to ${escapeHtml(nodes[node.parent].title)}</span>`
      : '';

  return `
    <div class="detail-header">
      <div class="detail-label">${escapeHtml(node.label)}</div>
      <div class="detail-title">${escapeHtml(node.title)}</div>
      <div class="detail-formula">${escapeHtml(node.formula)}</div>
    </div>
    <div class="detail-desc">${escapeHtml(node.desc)}</div>
    ${childrenHTML}
    ${connectedHTML}
    ${parentHTML}
  `;
}

function renderContentTab(node: Node, sanitizeMarkdown: boolean): string {
  const content = node.content || '<p style="color:var(--t-void); font-style:italic;">No content available.</p>';
  return `
    <div class="detail-header">
      <div class="detail-label">${escapeHtml(node.label)}</div>
      <div class="detail-title">${escapeHtml(node.title)}</div>
    </div>
    <div class="node-content" style="font-size:13px; line-height:2; color:var(--t-lo);">
      ${sanitizeMarkdown ? sanitizeHtml(content) : content}
    </div>
  `;
}

function formatDateLabel(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function computeSignalGap(node: Node): string | null {
  if (!node.first_noticed || !node.date_of_discovery) return null;
  const start = new Date(node.first_noticed).getTime();
  const end = new Date(node.date_of_discovery).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'gap: same-day confirmation';
  if (diffDays === 1) return 'gap: 1 day to confirmation';
  return `gap: ${diffDays} days to confirmation`;
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
  const type = node.type || 'note';
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

  const signalGap = computeSignalGap(node);
  const status = node.current_status ? toTitleCase(node.current_status) : null;
  const rows: string[] = [];

  if (type === 'signal') {
    if (node.first_noticed) rows.push(renderMetaRow('First noticed', formatDateLabel(node.first_noticed) || node.first_noticed));
    if (status) rows.push(renderMetaRow('Current status', status));
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (trails.length) rows.push(renderMetaRow('Linked trails', trails.join(' • ')));
    if (signalGap) rows.push(renderMetaRow('Trajectory', signalGap));
  } else if (type === 'trail') {
    if (node.source) rows.push(renderMetaRow('Source', node.source));
    if (node.date_of_discovery) {
      rows.push(renderMetaRow('Date of discovery', formatDateLabel(node.date_of_discovery) || node.date_of_discovery));
    }
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (linkedConcepts.length) rows.push(renderMetaRow('Concept link', linkedConcepts.join(' • ')));
  } else if (type === 'concept') {
    rows.push(
      renderMetaRow(
        'Cross-links',
        (node.connects || []).length ? String((node.connects || []).length) : 'No direct cross-links yet'
      )
    );
    if (linkedArticulations.length) rows.push(renderMetaRow('Articulations', linkedArticulations.join(' • ')));
    if (linkedSignals.length) rows.push(renderMetaRow('Signals', linkedSignals.join(' • ')));
    if (trails.length) rows.push(renderMetaRow('Trails', trails.join(' • ')));
  } else if (type === 'articulation') {
    if (node.source) rows.push(renderMetaRow('Reference', node.source));
    if (node.domain) rows.push(renderMetaRow('Domain', node.domain));
    if (linkedConcepts.length) rows.push(renderMetaRow('Concept anchor', linkedConcepts.join(' • ')));
    if (linkedSignals.length) rows.push(renderMetaRow('Live signals', linkedSignals.join(' • ')));
  } else if (type === 'projects') {
    if (node.publishDate || node.date) rows.push(renderMetaRow('Published', formatDateLabel(node.publishDate || node.date) || ''));
    if (node.externalUrl) rows.push(renderMetaRow('External', node.externalUrl));
  }

  if (!rows.length) return '';
  return `<div class="detail-meta detail-meta-${escapeAttr(type)}">${rows.join('')}</div>`;
}

export function renderDetailPanel({
  node,
  activeTab,
  breadcrumb,
  nodes,
  sanitizeMarkdown
}: DetailPanelParams): string {
  const tabs = renderTabs(activeTab);
  const bc = renderBreadcrumb(breadcrumb, node.id, nodes);

  let content = '';
  if (activeTab === 'explorer') {
    content = `${renderTypeSemantics(node, nodes)}${renderExplorerTab(node, nodes)}`;
  } else if (activeTab === 'content') {
    content = renderContentTab(node, sanitizeMarkdown);
  } else {
    content = `
      <div class="ascii-panel panel deep">
        <pre>${generateNodeDiagram(node, nodes)}</pre>
      </div>
    `;
  }

  return `${tabs}${bc}${content}`;
}
