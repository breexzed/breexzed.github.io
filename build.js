#!/usr/bin/env node

/**
 * Deprecated entrypoint kept for backwards compatibility.
 * Use: npm run build:topology
 */

const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'scripts', 'build-topology.js');
const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status || 1);
}
