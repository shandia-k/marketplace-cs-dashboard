/**
 * tests/unit/storage/backup-recovery.test.js
 * Storage unit testing: automatic recovery from .bak file upon corrupted JSON
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Standalone simulation of readWithBackupRecovery logic
function readJsonWithBackupRecovery(filePath, defaultFallback = []) {
  const bakPath = `${filePath}.bak`;
  let loaded = null;
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      loaded = JSON.parse(data);
    }
  } catch (err) {
    try {
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf8');
        loaded = JSON.parse(bakData);
      }
    } catch (bakErr) {}
  }

  if (loaded === null || typeof loaded !== 'object') {
    return defaultFallback;
  }
  return loaded;
}

describe('Level 3: Storage & Backup Auto-Recovery Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-recovery-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  test('should read intact JSON file normally', () => {
    const filePath = path.join(tempDir, 'valid.json');
    const validData = [{ id: 's1', name: 'Toko Normal' }];
    fs.writeFileSync(filePath, JSON.stringify(validData), 'utf8');

    const result = readJsonWithBackupRecovery(filePath, []);
    assert.deepEqual(result, validData);
  });

  test('should FAILOVER to .bak file when main JSON is corrupted/truncated', () => {
    const filePath = path.join(tempDir, 'corrupted.json');
    const bakPath = `${filePath}.bak`;

    const goodData = [{ id: 's1', name: 'Data Selamat dari Backup' }];
    fs.writeFileSync(bakPath, JSON.stringify(goodData), 'utf8');
    fs.writeFileSync(filePath, '{"incomplete_json_from_sudden_crash: [', 'utf8'); // Corrupted

    const recovered = readJsonWithBackupRecovery(filePath, []);
    assert.deepEqual(recovered, goodData, 'Must seamlessly load from .bak file');
  });

  test('should fallback to default fallback array if both main and .bak are missing or corrupt', () => {
    const filePath = path.join(tempDir, 'non_existent.json');
    const fallback = [{ id: 'default-1', name: 'Default Store' }];

    const result = readJsonWithBackupRecovery(filePath, fallback);
    assert.deepEqual(result, fallback);
  });
});
