/**
 * tests/smoke/smoke-readiness.test.js
 * Smoke testing for project integrity, asset existence, and build readiness
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Level 8: Smoke & Build Readiness Tests', () => {
  const rootDir = path.join(__dirname, '../..');

  test('should verify all core application entry points and assets exist', () => {
    const requiredFiles = [
      'package.json',
      'main.js',
      'preload.js',
      'webview-preload.js',
      'index.html',
      'assets/icon.ico',
      'js/app.js',
      'js/config.js',
      'js/modal.js',
      'js/quickreply.js',
      'js/sidebar.js',
      'js/state.js',
      'js/statusbar.js',
      'js/storage.js',
      'js/tabs.js',
      'js/tools.js',
      'js/utils.js',
      'js/versions-registry.js',
      'js/webview.js',
      'src/main/ipc/register-ipc.js',
      'src/main/services/auth.service.js',
      'src/main/services/session.service.js',
      'src/main/services/storage.service.js',
      'src/main/services/system.service.js',
      'src/main/services/updater.service.js',
      'src/main/config/constants.js',
      'src/main/config/app.config.js'
    ];

    requiredFiles.forEach(relPath => {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Required project file missing: ${relPath}`);
    });
  });

  test('should verify package.json has valid electron-builder configuration', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.name, 'package.json must have a name');
    assert.ok(pkg.version, 'package.json must have a version');
    assert.ok(pkg.main === 'main.js', 'main entry point must be main.js');
    assert.ok(pkg.build, 'Must have electron-builder build config');
    assert.ok(pkg.build.appId, 'Must define build.appId');
    assert.ok(pkg.build.productName, 'Must define build.productName');
    assert.ok(pkg.build.win, 'Must define build.win configuration');
  });

  test('should verify index.html links to all essential script tags', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    const requiredScripts = [
      'js/versions-registry.js',
      'js/config.js',
      'js/storage.js',
      'js/state.js',
      'js/utils.js',
      'js/app.js'
    ];

    requiredScripts.forEach(scriptPath => {
      assert.ok(html.includes(scriptPath), `index.html must include <script src="${scriptPath}">`);
    });
  });
});
