import type { Node } from '@/types/Node';
import { escapeHtml, escapeAttr } from '@/utils/markdown';

export function renderTreeNav(
  nodes: Record<string, Node>,
  order: string[],
  activeNode: string
): string {
  return order
    .map(id => {
      const n = nodes[id];
      if (!n) return '';
      const depth = Number(n.depth ?? 0);
      const glyph = n.glyph || (depth === 0 ? '◈' : depth === 1 ? '—' : '·');
      const formula = depth === 0 ? `<span class="ti-formula">${escapeHtml(n.formula)}</span>` : '';
      return `
        <div class="tree-item tree-item--${escapeAttr(n.type || 'note')}${id === activeNode ? ' active' : ''}" data-id="${escapeAttr(id)}" data-type="${escapeAttr(n.type || 'note')}" style="padding-left:${12 + depth * 16}px">
          <span class="ti-glyph">${escapeHtml(glyph)}</span>
          <span class="ti-name${depth === 0 ? ' root' : ''}">${escapeHtml(n.title)}</span>
          ${formula}
        </div>
      `;
    })
    .join('');
}
