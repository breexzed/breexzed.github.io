#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const ROOT_DIR = path.resolve(__dirname, '..');
const NODES_DIR = path.join(ROOT_DIR, 'nodes');
const VISUALS_DIR = path.join(ROOT_DIR, 'public', 'assets', 'visuals');
const TOPOLOGY_FILES = [
  path.join(ROOT_DIR, 'data', 'topology.json'),
  path.join(ROOT_DIR, 'public', 'data', 'topology.json')
];

function isExternalPath(value) {
  if (!value) return false;
  const v = String(value).toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:');
}

function sanitizeSegment(value) {
  return String(value).replace(/[^a-z0-9._-]/gi, '-');
}

function copyNodeAssets() {
  fs.mkdirSync(VISUALS_DIR, { recursive: true });
  const files = glob.sync('nodes/**/*.{png,jpg,jpeg,gif,svg,webp,avif}', {
    cwd: ROOT_DIR,
    nodir: true
  });

  const map = new Map();
  for (const relFile of files) {
    const absFile = path.join(ROOT_DIR, relFile);
    const relFromNodes = path.relative(NODES_DIR, absFile).split(path.sep);
    const firstDir = relFromNodes.length > 1 ? relFromNodes[0] : 'root';
    const baseName = path.parse(relFromNodes[relFromNodes.length - 1]).name;
    const ext = path.parse(relFromNodes[relFromNodes.length - 1]).ext.toLowerCase();
    const outName = `${sanitizeSegment(firstDir)}-${sanitizeSegment(baseName)}${ext}`;
    const outAbs = path.join(VISUALS_DIR, outName);
    const outPublic = `/assets/visuals/${outName}`;

    fs.copyFileSync(absFile, outAbs);
    map.set(path.normalize(absFile), outPublic);
    map.set(path.normalize(path.join(NODES_DIR, relFromNodes.join(path.sep))), outPublic);
    console.log(`✓ ${relFile} -> public/assets/visuals/${outName}`);
  }
  return map;
}

function resolveAssetPath(nodeSource, assetValue) {
  const raw = String(assetValue || '').trim();
  if (!raw || isExternalPath(raw)) return null;
  if (raw.startsWith('/')) {
    return path.normalize(path.join(ROOT_DIR, raw.replace(/^\/+/, '')));
  }
  const sourceAbs = path.join(NODES_DIR, nodeSource.split('/').join(path.sep));
  return path.normalize(path.resolve(path.dirname(sourceAbs), raw));
}

function rewriteNodeAssets(topology, copiedMap) {
  for (const node of Object.values(topology.nodes || {})) {
    const source = node.source || '';

    for (const field of ['visual', 'thumbnail']) {
      const current = node[field];
      if (!current || isExternalPath(current)) continue;
      const resolved = resolveAssetPath(source, current);
      if (!resolved) continue;
      const mapped = copiedMap.get(path.normalize(resolved));
      if (mapped) node[field] = mapped;
    }

    if (typeof node.content === 'string' && node.content.includes('src=')) {
      node.content = node.content.replace(/src=(['"])([^'"]+)\1/gi, (full, quote, src) => {
        if (isExternalPath(src)) return full;
        const resolved = resolveAssetPath(source, src);
        if (!resolved) return full;
        const mapped = copiedMap.get(path.normalize(resolved));
        return mapped ? `src=${quote}${mapped}${quote}` : full;
      });
    }
  }
}

function rewriteTopologyFiles(copiedMap) {
  for (const topologyPath of TOPOLOGY_FILES) {
    if (!fs.existsSync(topologyPath)) continue;
    const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
    rewriteNodeAssets(topology, copiedMap);
    fs.writeFileSync(topologyPath, JSON.stringify(topology, null, 2));
    console.log(`✓ Rewrote asset paths in ${path.relative(ROOT_DIR, topologyPath)}`);
  }
}

function main() {
  const copiedMap = copyNodeAssets();
  rewriteTopologyFiles(copiedMap);
}

main();
