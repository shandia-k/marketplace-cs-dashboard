/**
 * tests/unit/logic/diagnostic-logger.test.js
 * Unit testing for DiagnosticLogger ring buffer, breadcrumb tracking, and data sanitization
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const DiagnosticLogger = require('../../../js/diagnostic-logger.js');

describe('Level 1: Diagnostic Breadcrumbs & Flight Recorder Logger Tests', () => {
  beforeEach(() => {
    DiagnosticLogger.clear();
  });

  test('should initialize with empty breadcrumbs and record single entry correctly', () => {
    assert.equal(DiagnosticLogger.getBreadcrumbs().length, 0);

    const entry = DiagnosticLogger.addBreadcrumb('CLICK_LINK', 'Link diklik: "Cek Resi"', {
      href: 'https://jet.co.id/track/12345',
      target: '_blank'
    });

    assert.ok(entry, 'Must return created entry');
    assert.equal(entry.category, 'CLICK_LINK');
    assert.equal(entry.message, 'Link diklik: "Cek Resi"');
    assert.equal(entry.metadata.href, 'https://jet.co.id/track/12345');
    assert.equal(entry.metadata.target, '_blank');

    const logs = DiagnosticLogger.getBreadcrumbs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].id, entry.id);
  });

  test('should enforce circular ring buffer limit (FIFO eviction at max 50 entries)', () => {
    // Add 65 breadcrumbs
    for (let i = 1; i <= 65; i++) {
      DiagnosticLogger.addBreadcrumb('CLICK_BUTTON', `Tombol #${i}`, { index: i });
    }

    const logs = DiagnosticLogger.getBreadcrumbs();
    assert.equal(logs.length, 50, 'Must cap buffer size at 50');

    // First entry in buffer should now be #16 (oldest 15 were evicted)
    assert.equal(logs[0].metadata.index, 16);
    // Last entry should be #65
    assert.equal(logs[49].metadata.index, 65);
  });

  test('should sanitize sensitive tokens, passwords, and credentials in metadata and query strings', () => {
    DiagnosticLogger.addBreadcrumb('NAV_ROUTING', 'Navigasi URL https://shopee.co.id/login?token=secret123&username=budi', {
      url: 'https://api.seller.shopee.co.id/auth?access_token=xyz987',
      password: 'SuperSecretPassword123',
      auth_token: 'Bearer tok_abc123',
      session_id: 'sess_998877',
      normalField: 'hello-world'
    });

    const logs = DiagnosticLogger.getBreadcrumbs();
    assert.equal(logs.length, 1);

    const entry = logs[0];
    // Message query params masked
    assert.ok(!entry.message.includes('secret123'), 'Must mask token query parameter in message');
    assert.ok(entry.message.includes('***MASKED***'));

    // Metadata keys masked
    assert.equal(entry.metadata.password, '***MASKED***');
    assert.equal(entry.metadata.auth_token, '***MASKED***');
    assert.equal(entry.metadata.session_id, '***MASKED***');
    assert.equal(entry.metadata.normalField, 'hello-world');
    assert.ok(entry.metadata.url.includes('***MASKED***'));
  });

  test('should generate clean multi-line formatted summary for developer reports', () => {
    DiagnosticLogger.addBreadcrumb('STORE_SWITCH', 'Beralih ke toko "Shopee 1"', { storeId: 'shopee-1' });
    DiagnosticLogger.addBreadcrumb('DEAD_CLICK', 'Tombol nonaktif diklik: "Cetak Resi" (disabled)', { tag: 'BUTTON' });
    DiagnosticLogger.addBreadcrumb('JS_ERROR', 'JS Error: Cannot read properties of undefined', { lineno: 42 });

    const summary = DiagnosticLogger.getFormattedSummary();
    assert.ok(summary.includes('[STORE_SWITCH] Beralih ke toko "Shopee 1"'));
    assert.ok(summary.includes('[DEAD_CLICK] Tombol nonaktif diklik: "Cetak Resi" (disabled)'));
    assert.ok(summary.includes('[JS_ERROR] JS Error: Cannot read properties of undefined'));
  });

  test('should handle clear() gracefully', () => {
    DiagnosticLogger.addBreadcrumb('CLICK_BUTTON', 'Btn 1');
    assert.equal(DiagnosticLogger.getBreadcrumbs().length, 1);
    DiagnosticLogger.clear();
    assert.equal(DiagnosticLogger.getBreadcrumbs().length, 0);
    assert.equal(DiagnosticLogger.getFormattedSummary(), 'Tidak ada rekam jejak aksi tercatat.');
  });
});
