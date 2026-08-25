/**
 * tests/unit/storage/encrypted-storage.test.js
 * Unit tests for OS-native encrypted storage envelope and zero plaintext disk storage
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveEncryptedJsonSync, readEncryptedJsonSync } = require('../../../src/main/services/storage.service');

describe('Level 3: Encrypted Storage Envelope & Zero Plaintext Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-encrypted-storage-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  test('should write data as an encrypted envelope rather than plaintext JSON', () => {
    const targetFile = path.join(tempDir, 'sensitive_stores.json');
    const secretStores = [
      { id: 's1', name: 'Toko Rahasia Official', token: 'bearer_token_xyz_12345' },
      { id: 's2', name: 'Toko Cabang Jakarta', token: 'shopee_secret_session_99' }
    ];

    const success = saveEncryptedJsonSync(targetFile, secretStores);
    assert.equal(success, true);
    assert.equal(fs.existsSync(targetFile), true);

    // Baca langsung isi file mentah di disk
    const rawFileContent = fs.readFileSync(targetFile, 'utf8');
    
    // Verifikasi TIDAK ADA string rahasia dalam bentuk plaintext di disk
    assert.ok(!rawFileContent.includes('bearer_token_xyz_12345'), 'Disk file must NOT contain raw tokens');
    assert.ok(!rawFileContent.includes('Toko Rahasia Official'), 'Disk file must NOT contain shop names in plaintext');

    // Verifikasi format envelope terenkripsi
    const parsedEnvelope = JSON.parse(rawFileContent);
    assert.equal(parsedEnvelope.__vault_version__, 'v1');
    assert.ok(typeof parsedEnvelope.cipher === 'string');
    assert.ok(parsedEnvelope.cipher.startsWith('dpapi:v1:') || parsedEnvelope.cipher.startsWith('enc:v1:'));
  });

  test('should read and decrypt encrypted envelope data seamlessly', () => {
    const targetFile = path.join(tempDir, 'stores_decryption_test.json');
    const originalData = [
      { id: 'store_1', name: 'Official Store A', marketplace: 'shopee' },
      { id: 'store_2', name: 'Official Store B', marketplace: 'tokopedia' }
    ];

    saveEncryptedJsonSync(targetFile, originalData);

    const decryptedData = readEncryptedJsonSync(targetFile);
    assert.deepEqual(decryptedData, originalData);
  });

  test('should read legacy plaintext JSON files seamlessly (Zero-Downtime Migration)', () => {
    const targetFile = path.join(tempDir, 'legacy_plaintext.json');
    const legacyPlaintextData = [
      { id: 'old_1', name: 'Toko Lama', marketplace: 'shopee' }
    ];

    // Simulasikan file format lama yang disimpan sebelum enkripsi disk aktif
    fs.writeFileSync(targetFile, JSON.stringify(legacyPlaintextData, null, 2), 'utf8');

    const result = readEncryptedJsonSync(targetFile);
    assert.deepEqual(result, legacyPlaintextData, 'Must seamlessly load legacy plaintext JSON without errors');
  });

  test('should failover to encrypted .bak backup file if main file is damaged', () => {
    const targetFile = path.join(tempDir, 'corrupted_envelope.json');
    const bakFile = `${targetFile}.bak`;
    const safeData = [{ id: 'safe_1', name: 'Toko Terproteksi' }];

    // Simulasikan penyimpanan pertama
    saveEncryptedJsonSync(targetFile, safeData);

    // Simulasikan backup file yang valid
    fs.copyFileSync(targetFile, bakFile);

    // Rusak file utama (misal terpotong saat listrik padam)
    fs.writeFileSync(targetFile, '{"__vault_version__": "v1", "cipher": "BROKEN_TRUNCATED_CIPHER', 'utf8');

    const recoveredData = readEncryptedJsonSync(targetFile);
    assert.deepEqual(recoveredData, safeData, 'Must recover intact data from .bak file');
  });
});
