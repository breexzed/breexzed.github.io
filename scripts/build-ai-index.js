#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const topologyPath = path.join(ROOT_DIR, 'public', 'data', 'topology.json');
const outputDir = path.join(ROOT_DIR, 'public', 'ai');

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildAiIndex() {
  if (!fs.existsSync(topologyPath)) {
    throw new Error(`Missing topology file: ${topologyPath}`);
  }

  const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
  const nodes = Object.values(topology.nodes || {});
  const publishedNodes = nodes.filter(node => (node.status || 'published') === 'published');
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const relationships = [];

  for (const node of nodes) {
    for (const childId of Array.isArray(node.children) ? node.children : []) {
      if (nodeById.has(childId)) {
        relationships.push({ source: node.id, target: childId, relation: 'parent-child' });
      }
    }

    for (const relatedId of Array.isArray(node.connects) ? node.connects : []) {
      if (nodeById.has(relatedId)) {
        relationships.push({ source: node.id, target: relatedId, relation: 'connects' });
      }
    }
  }

  const nodeRecords = publishedNodes.map(node => ({
    id: node.id,
    title: cleanText(node.title),
    type: node.type || 'note',
    status: node.status || 'published',
    summary: cleanText(node.desc),
    formula: cleanText(node.formula),
    domain: cleanText(node.domain),
    tags: Array.isArray(node.tags) ? node.tags : [],
    parent: node.parent || null,
    children: Array.isArray(node.children) ? node.children : [],
    related: Array.isArray(node.connects) ? node.connects : [],
    sourcePath: node.sourcePath || null,
    url: `/node/${encodeURIComponent(node.id)}`,
    content: cleanText(node.markdown)
  }));

  const summaries = Object.entries(
    publishedNodes.reduce((groups, node) => {
      const key = node.type || 'note';
      groups[key] ||= [];
      groups[key].push({
        id: node.id,
        title: cleanText(node.title),
        summary: cleanText(node.desc),
        domain: cleanText(node.domain),
        tags: Array.isArray(node.tags) ? node.tags : []
      });
      return groups;
    }, {})
  ).map(([type, entries]) => ({
    type,
    count: entries.length,
    summary: `${entries.length} published ${type} node${entries.length === 1 ? '' : 's'} in the BREEXZED estate.`,
    entries
  }));

  fs.mkdirSync(outputDir, { recursive: true });
  const generated = new Date().toISOString();
  const manifest = {
    schema: 'breexzed.ai.v1',
    generated,
    description: 'Machine-readable retrieval index for the BREEXZED digital estate.',
    entrypoints: {
      manifest: '/ai/manifest.json',
      summaries: '/ai/summaries.json',
      nodes: '/ai/nodes.json',
      relationships: '/ai/relationships.json',
      humanGuide: '/llms.txt'
    },
    counts: {
      totalNodes: nodes.length,
      publishedNodes: publishedNodes.length,
      relationships: relationships.length
    },
    retrieval: {
      nodeById: '/ai/nodes.json',
      filterByType: 'Use the type field in nodes.json or summaries.json.',
      traverse: 'Use relationships.json and the source/target node IDs.'
    }
  };

  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputDir, 'summaries.json'), JSON.stringify({ schema: manifest.schema, generated, groups: summaries }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'nodes.json'), JSON.stringify({ schema: manifest.schema, generated, nodes: nodeRecords }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'relationships.json'), JSON.stringify({ schema: manifest.schema, generated, relationships }, null, 2));

  const llms = `# BREEXZED

BREEXZED is a living digital estate of projects, concepts, articulations, signals, trails, and notes.

## Machine-readable retrieval

- Manifest: /ai/manifest.json
- Thematic summaries: /ai/summaries.json
- Published node records and content: /ai/nodes.json
- Parent/child and cross-link relationships: /ai/relationships.json

## Retrieval guidance

Start with the manifest, use summaries to identify relevant areas, retrieve node records by id, and traverse relationships when context is needed. Node records include canonical public URLs and source paths.

## Public reading surfaces

- Home: /
- Corpus: /corpus
- Signals: /signals
- Projects: /projects
`;
  fs.writeFileSync(path.join(ROOT_DIR, 'public', 'llms.txt'), llms);

  console.log(`✓ AI retrieval index built (${publishedNodes.length} published nodes, ${relationships.length} relationships)`);
}

buildAiIndex();
