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

export function markdownHrefToNodeId(href: string): string {
  return href
    .replace(/\.\.\//g, '')
    .replace(/\.\//g, '')
    .replace('/index.md', '')
    .replace('.md', '');
}
