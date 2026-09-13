const SAFE_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p',
  'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul'
]);

const DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'noscript', 'template'
]);

const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'formaction', 'poster']);

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function renderPlainTextWithLinks(value: unknown): string {
  const text = String(value ?? '');
  const urlPattern = /https?:\/\/[^\s<]+/gi;
  let output = '';
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const trailing = rawUrl.match(/[),.;:!?]+$/)?.[0] || '';
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    const start = match.index ?? 0;
    output += escapeHtml(text.slice(cursor, start));
    output += `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    output += escapeHtml(trailing);
    cursor = start + rawUrl.length;
  }

  return output + escapeHtml(text.slice(cursor));
}

function isUnsafeUrl(raw: string): boolean {
  const value = String(raw || '')
    .replace(/[\u0000-\u001F\u007F\s]+/g, '')
    .toLowerCase();
  return (
    value.startsWith('javascript:') ||
    value.startsWith('vbscript:') ||
    value.startsWith('data:text/html')
  );
}

export function sanitizeHtml(html: string): string {
  if (!html) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html), 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  elements.forEach(el => {
    const tag = el.tagName.toLowerCase();

    if (DROP_TAGS.has(tag)) {
      el.remove();
      return;
    }

    if (!SAFE_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }

    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith('on') || name === 'srcdoc') {
        el.removeAttribute(attr.name);
        return;
      }
      if (URL_ATTRS.has(name) && isUnsafeUrl(value)) {
        el.removeAttribute(attr.name);
      }
    });

    if (tag === 'a' && (el.getAttribute('target') || '').toLowerCase() === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}

function stripMarkdownHref(href: string): string {
  const [withoutHash] = String(href || '').split('#');
  const [withoutQuery] = withoutHash.split('?');
  return withoutQuery.trim();
}

export function resolveMarkdownHrefToSourcePath(currentSourcePath: string, href: string): string | null {
  const normalizedHref = stripMarkdownHref(href);
  if (!normalizedHref || !normalizedHref.toLowerCase().endsWith('.md')) return null;

  const lowerHref = normalizedHref.toLowerCase();
  if (
    lowerHref.startsWith('http://') ||
    lowerHref.startsWith('https://') ||
    lowerHref.startsWith('mailto:') ||
    lowerHref.startsWith('tel:')
  ) {
    return null;
  }

  if (normalizedHref.startsWith('/')) {
    const fromRoot = normalizedHref.replace(/^\/+/, '');
    return decodeURIComponent(fromRoot.startsWith('nodes/') ? fromRoot.slice('nodes/'.length) : fromRoot);
  }

  if (!currentSourcePath) return null;

  const base = new URL(`https://breexzed.local/nodes/${currentSourcePath}`);
  const resolved = new URL(normalizedHref, base).pathname;
  if (!resolved.startsWith('/nodes/')) return null;
  return decodeURIComponent(resolved.slice('/nodes/'.length));
}
