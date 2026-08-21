/**
 * tests/unit/logic/template-engine.test.js
 * Unit testing for Quick Reply Template Engine variable resolution
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 1: Logic & Template Engine Tests (resolveTemplateVariables)', () => {
  let sandbox;
  let resolveTemplateVariables;

  beforeEach(() => {
    sandbox = createDOMSandbox();
    sandbox.window.currentClipboardValue = 'INV-999888';
    sandbox.window.currentUserProfile = { displayName: 'Mba Sarah' };
    sandbox.window.stores = [{ id: 'store-1', name: 'Official Store Jaya' }];
    sandbox.window.activeStoreId = 'store-1';

    const utilsCode = fs.readFileSync(path.join(__dirname, '../../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return resolveTemplateVariables;`);
    resolveTemplateVariables = fn(sandbox.window, sandbox.document, sandbox.localStorage);
  });

  test('should return empty string if input rawText is empty, null, or undefined', () => {
    assert.equal(resolveTemplateVariables(''), '');
    assert.equal(resolveTemplateVariables(null), '');
    assert.equal(resolveTemplateVariables(undefined), '');
  });

  test('should replace {clipboard}, {resi}, and {order} with clipboard text', () => {
    const raw = 'Nomor order {order} dan resi {resi} dari {clipboard}';
    const result = resolveTemplateVariables(raw);
    assert.equal(result, 'Nomor order INV-999888 dan resi INV-999888 dari INV-999888');
  });

  test('should replace {toko} with active store name', () => {
    const raw = 'Terima kasih telah berbelanja di {toko}!';
    const result = resolveTemplateVariables(raw);
    assert.equal(result, 'Terima kasih telah berbelanja di Official Store Jaya!');
  });

  test('should replace {cs} and aliases {nama_cs}, {nama}, {cs_name}, {nama_pengguna}, {user}', () => {
    const raw = 'Halo dari {cs}, nama CS adalah {nama_cs} atau {user} ({nama_pengguna})';
    const result = resolveTemplateVariables(raw);
    assert.equal(result, 'Halo dari Mba Sarah, nama CS adalah Mba Sarah atau Mba Sarah (Mba Sarah)');
  });

  test('should replace {customer} and aliases {pembeli}, {buyer}, {nama_pembeli}, {nama_customer}', () => {
    const raw = 'Halo {customer}, {pembeli} dan {buyer} ({nama_pembeli})';
    const result = resolveTemplateVariables(raw, { customer: 'Kak Doni' });
    assert.equal(result, 'Halo Kak Doni, Kak Doni dan Kak Doni (Kak Doni)');
  });

  test('should be case-insensitive for placeholders ({CLIPBOARD}, {TOKO}, {WAKTU}, {CS})', () => {
    const raw = 'Halo kak {CUSTOMER}, selamat {WAKTU}! Dengan CS {CS} di {TOKO}. Resi: {RESI}';
    const result = resolveTemplateVariables(raw, {
      customer: 'Sdr. Andi',
      waktu: 'siang',
      csName: 'Admin Rina',
      storeName: 'Toko Berkah',
      clipboard: 'SPXID0123456789'
    });
    assert.equal(result, 'Halo kak Sdr. Andi, selamat siang! Dengan CS Admin Rina di Toko Berkah. Resi: SPXID0123456789');
  });

  test('should fallback to "..." if clipboard is empty and not provided', () => {
    sandbox.window.currentClipboardValue = '';
    const raw = 'Nomor resi Anda: {resi}';
    const result = resolveTemplateVariables(raw);
    assert.equal(result, 'Nomor resi Anda: ...');
  });

  test('should accept options as a plain string representing clipboard override', () => {
    const raw = 'Resi: {resi}';
    const result = resolveTemplateVariables(raw, 'JNE123456789');
    assert.equal(result, 'Resi: JNE123456789');
  });
});
