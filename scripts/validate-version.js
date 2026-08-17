#!/usr/bin/env node
/**
 * scripts/validate-version.js
 * Pre-Release / Build Validator:
 * Memastikan bahwa nomor versi di package.json memiliki catatan rilis changelog
 * yang lengkap dan terdaftar pada indeks teratas di js/versions-registry.js.
 */

const path = require('path');
const fs = require('fs');

const pkgPath = path.join(__dirname, '..', 'package.json');
const registryPath = path.join(__dirname, '..', 'js', 'versions-registry.js');

try {
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`File package.json tidak ditemukan di: ${pkgPath}`);
  }

  if (!fs.existsSync(registryPath)) {
    throw new Error(`File js/versions-registry.js tidak ditemukan di: ${registryPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const versionsRegistry = require(registryPath);

  console.log(`\n🔍 [Release Guard] Memeriksa kelayakan versi ${pkg.version}...`);

  const result = versionsRegistry.validateVersion(pkg.version);

  console.log(`\x1b[32m✔ [Release Guard] Sukses! Changelog untuk versi ${result.version} valid dan siap dirilis.\x1b[0m\n`);
  process.exit(0);
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', error.message);
  process.exit(1);
}
