/**
 * explorer.js
 * Lens Map Explorer - Topology Navigation
 * 
 * Loads topology.json and renders interactive map
 */

const Explorer = (() => {
  let NODES = {};
  let TREE_ORDER = [];
  let activeNode = 'root';
  let activeTab = 'explorer';
  let breadcrumb = ['root'];
  const Compat = window.LensMapCompat || {
    flag: () => false
  };
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function resolveHashToNode(rawHash) {
    if (!rawHash) return null;
    if (NODES[rawHash]) return rawHash;

    if (Compat.flag('hashRoutingPath') && rawHash.includes('/')) {
      const leaf = rawHash.split('/').filter(Boolean).pop();
      if (leaf && NODES[leaf]) return leaf;
    }

    return null;
  }

  function buildBreadcrumbPath(id) {
    const path = [];
    let cur = id;
    while (cur && NODES[cur]) {
      path.unshift(cur);
      cur = NODES[cur].parent;
    }
    return path.length ? path : ['root'];
  }

  function getTreeRenderOrder() {
    if (TREE_ORDER && TREE_ORDER.length > 0) return TREE_ORDER;
    if (!Compat.flag('treeOrderFallback')) return [];

    const ids = Object.keys(NODES);
    ids.sort((a, b) => {
      const da = Number(NODES[a]?.depth ?? 999);
      const db = Number(NODES[b]?.depth ?? 999);
      if (da !== db) return da - db;
      return String(NODES[a]?.title || a).localeCompare(String(NODES[b]?.title || b));
    });

    if (NODES.root) {
      return ['root', ...ids.filter(id => id !== 'root')];
    }
    return ids;
  }

  function sanitizeHtml(html) {
    if (!Compat.flag('markdownSanitize') || !html) return html;

    function isUnsafeUrl(raw) {
      const value = String(raw || '')
        .replace(/[\u0000-\u001F\u007F\s]+/g, '')
        .toLowerCase();
      return (
        value.startsWith('javascript:') ||
        value.startsWith('vbscript:') ||
        value.startsWith('data:text/html')
      );
    }

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

      if (tag === 'a') {
        const target = (el.getAttribute('target') || '').toLowerCase();
        if (target === '_blank') {
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });

    return doc.body.innerHTML;
  }

  // Initialize: Load topology and restore state
  async function init() {
    try {
      // Load topology from JSON
      const response = await fetch('./data/topology.json');
      const topology = await response.json();
      
      NODES = topology.nodes;
      TREE_ORDER = topology.treeOrder;
      
      console.log(`✓ Topology loaded: ${topology.nodeCount} nodes`);
      
      // Restore last visited node or use URL hash
      const hash = location.hash.slice(1);
      const lastNode = Persistence.getLastNode();
      const hashNode = resolveHashToNode(hash);
      
      if (hashNode) {
        activeNode = hashNode;
      } else if (lastNode && NODES[lastNode]) {
        activeNode = lastNode;
      }
      
      // Restore last active tab
      const state = Persistence.load();
      activeTab = state.activeTab || 'explorer';
      if (Compat.flag('breadcrumbInit')) {
        breadcrumb = buildBreadcrumbPath(activeNode);
      }
      
      // Initial render
      buildTree();
      renderDetail();
      
      // Setup hash change listener for deep linking
      window.addEventListener('hashchange', handleHashChange);
      
    } catch (err) {
      console.error('Failed to load topology:', err);
      document.getElementById('detail-panel').innerHTML = `
        <div style="padding:40px; text-align:center; color:var(--t-lo);">
          <p style="margin-bottom:20px;">Failed to load topology data.</p>
          <p style="font-size:11px; color:var(--t-void);">Check that data/topology.json exists and build.js ran successfully.</p>
        </div>
      `;
    }
  }

  // Handle URL hash changes
  function handleHashChange() {
    const hash = location.hash.slice(1);
    const nodeId = resolveHashToNode(hash);
    if (nodeId && nodeId !== activeNode) {
      navigate(nodeId);
    }
  }

  // Build sidebar tree
  function buildTree() {
    const nav = document.getElementById('tree-nav');
    nav.innerHTML = '';

    const order = getTreeRenderOrder();
    order.forEach(id => {
      const n = NODES[id];
      if (!n) return;

      const el = document.createElement('div');
      el.className = 'tree-item' + (id === activeNode ? ' active' : '');
      el.dataset.id = id;
      el.style.paddingLeft = `${12 + n.depth * 16}px`; // FIX: Proper indentation

      const glyphEl = document.createElement('span');
      glyphEl.className = 'ti-glyph';
      glyphEl.textContent = n.glyph || (n.depth === 0 ? '◈' : n.depth === 1 ? '—' : '·');

      const nameEl = document.createElement('span');
      nameEl.className = 'ti-name' + (n.depth === 0 ? ' root' : '');
      nameEl.textContent = n.title;

      el.appendChild(glyphEl);
      el.appendChild(nameEl);

      if (n.depth === 0) {
        const formulaEl = document.createElement('span');
        formulaEl.className = 'ti-formula';
        formulaEl.textContent = n.formula;
        el.appendChild(formulaEl);
      }

      el.addEventListener('click', () => navigate(id));
      nav.appendChild(el);
    });
  }

  // Navigate to node
  function navigate(id) {
    if (!NODES[id]) return;

    activeNode = id;

    // Build breadcrumb path
    breadcrumb = buildBreadcrumbPath(id);

    // Update URL hash
    history.pushState({ node: id }, '', `#${id}`);

    // Save state
    Persistence.updateCurrentNode(id, NODES[id].title);

    // Fade out → update → fade in
    const panel = document.getElementById('detail-panel');
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(6px)';
    panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';

    setTimeout(() => {
      buildTree();
      renderDetail();
      panel.style.opacity = '1';
      panel.style.transform = 'none';
      panel.style.transition = 'opacity 0.26s ease 0.04s, transform 0.26s ease 0.04s';
    }, 160);
  }

  // Render detail panel
  function renderDetail() {
    const panel = document.getElementById('detail-panel');
    const n = NODES[activeNode];
    if (!n) return;

    // Tab buttons
    const tabsHTML = `
      <div class="exp-tabs">
        <button class="exp-tab ${activeTab==='explorer'?'active':''}" data-tab="explorer">Explorer</button>
        <button class="exp-tab ${activeTab==='content'?'active':''}" data-tab="content">Content</button>
        <button class="exp-tab ${activeTab==='diagram'?'active':''}" data-tab="diagram">Diagram</button>
      </div>
    `;

    // Breadcrumb
    const bcHTML = `
      <div class="breadcrumb">
        ${breadcrumb.map((bid, i) => `
          <span class="bc-item ${bid===activeNode?'current':''}" data-id="${escapeAttr(bid)}">${escapeHtml(NODES[bid]?.title || bid)}</span>
          ${i < breadcrumb.length-1 ? '<span class="bc-sep">›</span>' : ''}
        `).join('')}
      </div>
    `;

    let contentHTML = '';

    // TAB: Explorer (overview + children)
    if (activeTab === 'explorer') {
      const childrenHTML = n.children && n.children.length ? `
        <div class="detail-children">
          <div class="detail-children-label">Connected Nodes</div>
          ${n.children.map(cid => {
            const c = NODES[cid];
            if (!c) return '';
            return `
              <div class="child-card" data-id="${escapeAttr(cid)}">
                <div>
                  <div class="cc-name">${escapeHtml(c.title)}</div>
                  <div class="cc-sub">${escapeHtml(c.formula)}</div>
                </div>
                <span class="cc-arrow">→</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : '';

      const parentHTML = n.parent && NODES[n.parent] ? `
        <span class="back-link" data-id="${escapeAttr(n.parent)}">← Back to ${escapeHtml(NODES[n.parent].title)}</span>
      ` : '';

      contentHTML = `
        ${bcHTML}
        <div class="detail-header">
          <div class="detail-label">${escapeHtml(n.label)}</div>
          <div class="detail-title">${escapeHtml(n.title)}</div>
          <div class="detail-formula">${escapeHtml(n.formula)}</div>
        </div>
        <div class="detail-desc">${escapeHtml(n.desc)}</div>
        ${childrenHTML}
        ${parentHTML}
      `;
    }

    // TAB: Content (full Markdown rendered as HTML)
    else if (activeTab === 'content') {
      contentHTML = `
        ${bcHTML}
        <div class="detail-header">
          <div class="detail-label">${escapeHtml(n.label)}</div>
          <div class="detail-title">${escapeHtml(n.title)}</div>
        </div>
        <div class="node-content" style="font-size:13px; line-height:2; color:var(--t-lo);">
          ${sanitizeHtml(n.content || '<p style="color:var(--t-void); font-style:italic;">No content available.</p>')}
        </div>
      `;
    }

    // TAB: Diagram (ASCII or visual)
    else if (activeTab === 'diagram') {
      const asciiDiagram = generateNodeDiagram(activeNode);
      
      contentHTML = `
        ${bcHTML}
        <div class="ascii-panel panel deep">
          <pre>${asciiDiagram}</pre>
        </div>
      `;
    }

    panel.innerHTML = tabsHTML + contentHTML;

    // Bind tab clicks
    panel.querySelectorAll('.exp-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        Persistence.updateActiveTab(activeTab);
        renderDetail();
      });
    });

    // Bind navigation elements
    panel.querySelectorAll('.child-card, .back-link, .bc-item').forEach(el => {
      const id = el.dataset.id;
      if (id && el.dataset.id !== activeNode) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => navigate(id));
      }
    });

    // Make content links clickable
    panel.querySelectorAll('.node-content a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.md')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          // Convert MD link to node ID and navigate
          const nodeId = href.replace(/\.\.\//g, '').replace(/\.\//g, '').replace('/index.md', '').replace('.md', '');
          if (NODES[nodeId]) navigate(nodeId);
        });
      }
    });
  }

  // Generate context-specific ASCII diagram
  function generateNodeDiagram(nodeId) {
    const n = NODES[nodeId];
    if (!n) return '';

    // Build a local tree view centered on this node
    let output = `<span class="a-d">Viewing: ${escapeHtml(n.title)}</span>\n\n`;
    
    if (n.parent) {
      const p = NODES[n.parent];
      output += `  <span class="a-d">↑ ${escapeHtml(p ? p.title : n.parent)}</span>\n`;
      output += `  <span class="a-d">│</span>\n`;
    }
    
    output += `  <span class="a-n">┌─────────────────────────────────┐</span>\n`;
    output += `  <span class="a-f">│   ${escapeHtml(n.formula).padEnd(29)} │</span>\n`;
    output += `  <span class="a-n">│                                 │</span>\n`;
    output += `  <span class="a-f">│   ${escapeHtml(n.title).padEnd(29)} │</span>\n`;
    output += `  <span class="a-n">└─────────────────────────────────┘</span>\n`;
    
    if (n.children && n.children.length) {
      output += `  <span class="a-d">│</span>\n`;
      n.children.forEach((cid, i) => {
        const c = NODES[cid];
        if (!c) return;
        const isLast = i === n.children.length - 1;
        output += `  <span class="a-d">${isLast ? '└' : '├'}─ ${escapeHtml(c.title)}</span>\n`;
      });
    }
    
    return output;
  }

  // Export public API
  return {
    init,
    navigate,
    getActiveNode: () => activeNode,
    getNodes: () => NODES
  };
})();

// Make available globally
window.Explorer = Explorer;
