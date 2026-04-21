#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const topologyPath = path.resolve(__dirname, '..', 'public', 'data', 'topology.json');
const outputPath = path.resolve(__dirname, '..', 'public', 'data', 'search-index.json');

function buildSearchIndex() {
  if (!fs.existsSync(topologyPath)) {
    throw new Error(`Missing topology file: ${topologyPath}`);
  }

  const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
  const docs = Object.values(topology.nodes || {})
    .filter(node => node.id !== 'root' && (node.status || 'published') === 'published')
    .map(node => ({
      id: node.id,
      title: node.title || '',
      desc: node.desc || '',
      markdown: node.markdown || '',
      tags: Array.isArray(node.tags) ? node.tags.join(' ') : '',
      type: node.type || 'note',
      formula: node.formula || '',
      domain: node.domain || '',
      signalStatus: node.current_status || '',
      sourceRef: node.source || ''
    }));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        nodeCount: Object.keys(topology.nodes || {}).length,
        indexedCount: docs.length,
        docs
      },
      null,
      2
    )
  );

  console.log(`✓ Search index built (${docs.length} docs)`);
}

buildSearchIndex();
