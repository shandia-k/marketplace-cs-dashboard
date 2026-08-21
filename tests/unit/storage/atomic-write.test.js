/**
 * tests/unit/storage/atomic-write.test.js
 * Storage unit testing: atomic file writes, backup generation, and failure resilience
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { atomicWriteJsonSync } = require('../../../src/main/services/storage.service');

describe('Level 3: Storage & Atomic Write Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-storage-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  test('should create valid JSON file atomically', () => {
    const targetFile = path.join(tempDir, 'test_data.json');
    const data = { app: 'CS Dashboard', version: '1.0.0', stores: [1, 2, 3] };

    const success = atomicWriteJsonSync(targetFile, data);
    assert.equal(success, true);
    assert.equal(fs.existsSync(targetFile), true);

    const parsed = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.deepEqual(parsed, data);
  });

  test('should automatically create .bak backup copy when overwriting existing file', () => {
    const targetFile = path.join(tempDir, 'stores.json');
    const bakFile = `${targetFile}.bak`;

    const initialData = [{ id: 'store-1', name: 'Original Store' }];
    atomicWriteJsonSync(targetFile, initialData);

    const updatedData = [{ id: 'store-1', name: 'Updated Store' }, { id: 'store-2', name: 'New Store' }];
    atomicWriteJsonSync(targetFile, updatedData);

    assert.equal(fs.existsSync(bakFile), true, 'Backup file (.bak) must exist');
    const bakContent = JSON.parse(fs.readFileSync(bakFile, 'utf8'));
    assert.deepEqual(bakContent, initialData, 'Backup content must preserve prior state');

    const curContent = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.deepEqual(curContent, updatedData, 'Current file must contain new data');
  });

  test('should not leave temporary (.tmp) files lingering on disk', () => {
    const targetFile = path.join(tempDir, 'clean_test.json');
    atomicWriteJsonSync(targetFile, { test: 123 });

    const files = fs.readdirSync(tempDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    assert.equal(tmpFiles.length, 0, 'No .tmp files should remain in the directory');
  });
});
