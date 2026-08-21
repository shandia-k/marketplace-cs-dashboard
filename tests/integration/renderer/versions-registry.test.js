/**
 * tests/integration/renderer/versions-registry.test.js
 * Integration testing for Version Registry and Release Guard integrity
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const versionsRegistry = require('../../../js/versions-registry.js');
const pkg = require('../../../package.json');

describe('Level 5: Version Registry & Release Guard Tests (js/versions-registry.js)', () => {
  test('should validate current package.json version against the latest changelog entry', () => {
    const res = versionsRegistry.validateVersion(pkg.version);
    assert.ok(res, 'Validation must succeed');
    assert.equal(res.version, pkg.version);
  });

  test('should fail validation when validating an unregistered version number', () => {
    assert.throws(() => {
      versionsRegistry.validateVersion('999.999.999');
    }, /BELUM memiliki catatan changelog/i);
  });

  test('should ensure all changelog entries have valid SemVer, date, title, and categories', () => {
    const list = versionsRegistry.getAllVersions();
    assert.ok(Array.isArray(list) && list.length > 0);

    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

    list.forEach(entry => {
      assert.ok(semverRegex.test(entry.version), `Version ${entry.version} must follow SemVer format`);
      assert.ok(entry.releaseDate, `Version ${entry.version} must have a release date`);
      assert.ok(entry.title, `Version ${entry.version} must have a title`);
      assert.ok(Array.isArray(entry.highlights) && entry.highlights.length >= 4, `Version ${entry.version} must have at least 4 highlights`);
      assert.ok(Array.isArray(entry.categories) && entry.categories.length > 0, `Version ${entry.version} must have categories`);
    });
  });

  test('should ensure the top entry in the registry is the latest active version', () => {
    const latest = versionsRegistry.getLatestVersion();
    assert.ok(latest);
    assert.equal(latest.version, pkg.version, 'Latest version in registry must match package.json');
  });
});
