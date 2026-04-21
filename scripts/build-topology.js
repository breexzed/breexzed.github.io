#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const NODES_DIR = path.join(ROOT_DIR, 'nodes');
const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'topology.json');
const PUBLIC_OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'topology.json');
const VALID_NODE_TYPES = new Set(['note', 'projects', 'essay', 'page', 'articulation', 'signal', 'trail', 'concept']);
const VALID_SIGNAL_STATUS = new Set(['invisible', 'emerging', 'confirmed', 'shocked']);

function isMissingRequired(frontmatter, field) {
  return frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '';
}

function normalizeChildren(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeNodeType(value) {
  const raw = String(value || 'note').trim().toLowerCase();
  if (raw === 'project') return 'projects';
  return raw;
}

function normalizeConnects(value) {
  return normalizeChildren(value);
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeSource(absPath) {
  return path.relative(NODES_DIR, absPath).split(path.sep).join('/');
}

function extractFirstParagraph(markdown) {
  const lines = markdown.split('\n').filter(Boolean);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (clean.startsWith('#') || clean === '---') continue;
    if (clean.length > 20) {
      return clean.replace(/\*\*/g, '').replace(/\*/g, '');
    }
  }
  return '';
}

function extractMarkdownLinks(markdown) {
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    links.push(match[2]);
  }
  return links;
}

function isExternalHref(href) {
  if (!href) return true;
  const value = String(href).trim().toLowerCase();
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('#')
  );
}

function resolveMdLinkToFile(currentFile, href) {
  const [withoutHash] = href.split('#');
  const [withoutQuery] = withoutHash.split('?');
  const normalized = withoutQuery.trim();
  if (!normalized || !normalized.endsWith('.md')) return null;

  if (normalized.startsWith('/')) {
    const withoutLeadingSlash = normalized.replace(/^\/+/, '');
    const fromNodesRoot = withoutLeadingSlash.startsWith('nodes/')
      ? withoutLeadingSlash.slice('nodes/'.length)
      : withoutLeadingSlash;
    return path.normalize(path.join(NODES_DIR, fromNodesRoot));
  }

  return path.normalize(path.resolve(path.dirname(currentFile), normalized));
}

function generateTreeOrder(nodes) {
  const order = [];
  const visited = new Set();
  const roots = nodes.root ? ['root'] : Object.keys(nodes).filter(id => !nodes[id].parent);
  const queue = [...roots];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    if (!nodes[id]) {
      console.warn(`Referenced node "${id}" not found`);
      continue;
    }

    visited.add(id);
    order.push(id);

    const children = Array.isArray(nodes[id].children) ? nodes[id].children : [];
    for (const childId of children) {
      if (nodes[childId] && !visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  const remainder = Object.keys(nodes)
    .filter(id => !visited.has(id))
    .sort((a, b) => {
      const da = Number(nodes[a].depth ?? 999);
      const db = Number(nodes[b].depth ?? 999);
      if (da !== db) return da - db;
      return String(nodes[a].title || a).localeCompare(String(nodes[b].title || b));
    });

  return order.concat(remainder);
}

async function buildTopology() {
  console.log('Building topology from Markdown (profile: strict)...\n');

  const relativeFiles = await glob('nodes/**/*.md', { cwd: ROOT_DIR, nodir: true });
  const files = relativeFiles.map(file => path.join(ROOT_DIR, file));
  if (files.length === 0) {
    throw new Error(`No Markdown files found in ${NODES_DIR}`);
  }

  const errors = [];
  const rawNodes = new Map();
  const fileToId = new Map();

  // Pass 1: parse and validate frontmatter, collect IDs.
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const { data: frontmatter, content: body } = matter(content);

    const required = ['id', 'title', 'formula', 'depth'];
    const missing = required.filter(field => isMissingRequired(frontmatter, field));
    if (missing.length > 0) {
      errors.push(`${normalizeSource(file)}: Missing required fields: ${missing.join(', ')}`);
      continue;
    }

    const id = String(frontmatter.id).trim();
    const normalizedType = normalizeNodeType(frontmatter.type);
    if (!VALID_NODE_TYPES.has(normalizedType)) {
      errors.push(
        `${normalizeSource(file)}: Invalid node type "${frontmatter.type}". Valid types: ${[...VALID_NODE_TYPES].join(', ')}`
      );
      continue;
    }

    if (normalizedType === 'signal' && !isMissingRequired(frontmatter, 'current_status')) {
      const currentStatus = String(frontmatter.current_status).trim().toLowerCase();
      if (!VALID_SIGNAL_STATUS.has(currentStatus)) {
        errors.push(
          `${normalizeSource(file)}: Invalid signal current_status "${frontmatter.current_status}". Valid values: ${[...VALID_SIGNAL_STATUS].join(', ')}`
        );
        continue;
      }
    }

    if (id !== id.toLowerCase()) {
      errors.push(`${normalizeSource(file)}: Node id must be lowercase: "${id}"`);
      continue;
    }

    if (fileToId.has(file)) {
      errors.push(`${normalizeSource(file)}: Duplicate source path encountered`);
      continue;
    }

    const existingPath = [...fileToId.entries()].find(([, existingId]) => existingId === id)?.[0];
    if (existingPath) {
      errors.push(
        `Duplicate node id "${id}" in ${normalizeSource(existingPath)} and ${normalizeSource(file)}`
      );
      continue;
    }

    fileToId.set(path.normalize(file), id);
    rawNodes.set(id, { file: path.normalize(file), frontmatter, body });
    console.log(`✓ ${id.padEnd(20)} (${normalizeSource(file)})`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const nodes = {};
  const brokenLinks = [];

  // Pass 2: build nodes and resolve links.
  for (const [id, entry] of rawNodes.entries()) {
    const { file, frontmatter, body } = entry;
    const parsedContent = marked.parse(body);

    const explicitChildren = normalizeChildren(frontmatter.children);
    const explicitConnects = normalizeConnects(frontmatter.connects);
    let inferredChildren = [];

    if (explicitChildren.length === 0 && explicitConnects.length === 0) {
      const linkHrefs = extractMarkdownLinks(body).filter(href => !isExternalHref(href));
      const resolvedChildren = [];

      for (const href of linkHrefs) {
        const targetFile = resolveMdLinkToFile(file, href);
        if (!targetFile) continue;

        const targetId = fileToId.get(path.normalize(targetFile));
        if (!targetId) {
          brokenLinks.push(`${id}: unresolved link "${href}" -> ${normalizeSource(targetFile)}`);
          continue;
        }

        resolvedChildren.push(targetId);
      }

      inferredChildren = [...new Set(resolvedChildren)];
    }

    const children = [...new Set([...explicitChildren, ...inferredChildren])];
    const connects = [...new Set(explicitConnects)];

    const type = normalizeNodeType(frontmatter.type);
    const status = frontmatter.status || 'published';
    const publishDate =
      frontmatter.publishDate ||
      frontmatter.date ||
      new Date().toISOString().split('T')[0];

    nodes[id] = {
      id,
      label: frontmatter.label || frontmatter.title,
      title: frontmatter.title,
      formula: frontmatter.formula,
      desc: extractFirstParagraph(body),
      content: parsedContent,
      markdown: body,
      parent: frontmatter.parent || null,
      children,
      connects,
      depth: Number(frontmatter.depth),
      glyph: frontmatter.glyph || '·',
      visual: frontmatter.visual || null,
      tags: normalizeTags(frontmatter.tags),
      date: frontmatter.date || new Date().toISOString().split('T')[0],
      source: normalizeSource(file),
      type,
      featured: frontmatter.featured === true,
      thumbnail: frontmatter.thumbnail || null,
      externalUrl: frontmatter.externalUrl || null,
      publishDate,
      status,
      first_noticed: frontmatter.first_noticed || null,
      current_status:
        type === 'signal' && frontmatter.current_status
          ? String(frontmatter.current_status).trim().toLowerCase()
          : null,
      domain: frontmatter.domain || null,
      date_of_discovery: frontmatter.date_of_discovery || null
    };
  }

  if (brokenLinks.length > 0) {
    throw new Error(`Broken markdown links:\n${brokenLinks.join('\n')}`);
  }

  // Relationship validation.
  const relationErrors = [];
  for (const [id, node] of Object.entries(nodes)) {
    if (node.parent && !nodes[node.parent]) {
      relationErrors.push(`Node "${id}" references non-existent parent "${node.parent}"`);
    }
    for (const childId of node.children) {
      if (!nodes[childId]) {
        relationErrors.push(`Node "${id}" references non-existent child "${childId}"`);
      }
    }
    for (const connectedId of node.connects || []) {
      if (!nodes[connectedId]) {
        relationErrors.push(`Node "${id}" references non-existent connected node "${connectedId}"`);
      }
    }
  }
  if (relationErrors.length > 0) {
    throw new Error(relationErrors.join('\n'));
  }

  const treeOrder = generateTreeOrder(nodes);
  if (treeOrder.length === 0) {
    throw new Error('Generated treeOrder is empty');
  }

  const topology = {
    generated: new Date().toISOString(),
    nodeCount: Object.keys(nodes).length,
    nodes,
    treeOrder,
    metadata: {
      version: '2.0-phase4',
      builder: 'scripts/build-topology.js',
      source: 'Markdown → JSON',
      profile: 'strict'
    }
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(topology, null, 2));

  fs.mkdirSync(path.dirname(PUBLIC_OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(PUBLIC_OUTPUT_FILE, JSON.stringify(topology, null, 2));

  console.log(`\nTopology built: ${topology.nodeCount} nodes`);
  console.log(`Output: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  console.log(`Output: ${path.relative(ROOT_DIR, PUBLIC_OUTPUT_FILE)}\n`);
}

buildTopology().catch(err => {
  console.error('Build failed:', err.message || err);
  process.exit(1);
});
