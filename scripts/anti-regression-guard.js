#!/usr/bin/env node
/**
 * scripts/anti-regression-guard.js
 * Pre-Commit & Pre-Release Anti-Regression Guard
 * 
 * Performs:
 * 1. Release Guard Version & Changelog validation
 * 2. Automated Testing Multi-Level Suite execution across all 8 architectural layers
 * 3. Halts build/commit if any regression or test failure is detected.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const registryPath = path.join(rootDir, 'js', 'versions-registry.js');

console.log('\n\x1b[1m\x1b[35m═══════════════════════════════════════════════════════════════════════════════\x1b[0m');
console.log('\x1b[1m\x1b[35m  🛡️  ANTI-REGRESSION & RELEASE GUARD PIPELINE (Marketplace CS Dashboard)      \x1b[0m');
console.log('\x1b[1m\x1b[35m═══════════════════════════════════════════════════════════════════════════════\x1b[0m\n');

try {
  // 1. Release Guard Validation
  if (!fs.existsSync(pkgPath) || !fs.existsSync(registryPath)) {
    throw new Error('Berkas package.json atau js/versions-registry.js tidak ditemukan!');
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const versionsRegistry = require(registryPath);

  console.log(`\x1b[36m[Guard Step 1/2]\x1b[0m Memeriksa validitas versi ${pkg.version} di changelog registry...`);
  const valResult = versionsRegistry.validateVersion(pkg.version);
  console.log(`\x1b[32m✔ Changelog untuk versi ${valResult.version} terdaftar & valid.\x1b[0m\n`);

  // 2. Multi-Level Automated Tests
  console.log(`\x1b[36m[Guard Step 2/2]\x1b[0m Menjalankan seluruh automated test multi-level...`);
  const testRunner = spawnSync(process.execPath, [path.join(rootDir, 'tests', 'run-all-tests.js')], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  if (testRunner.status !== 0) {
    throw new Error('Satu atau lebih automated test gagal! Build/Commit dibatalkan demi mencegah regresi.');
  }

  console.log(`\n\x1b[1m\x1b[32m✔ [ANTI-REGRESSION GUARD PASSED] Aplikasi 100% stabil dan siap dijalankan/dibuild!\x1b[0m\n`);
  process.exit(0);
} catch (err) {
  console.error(`\n\x1b[1m\x1b[31m✖ [GUARD REJECTED]\x1b[0m \x1b[31m${err.message}\x1b[0m\n`);
  process.exit(1);
}
