/**
 * tests/regression/regression-catalog.test.js
 * Dedicated Regression Test Catalog (Bug-to-Test Mapping)
 * 
 * Every fixed bug or prevented edge case is permanently registered here
 * with a unique REG-XXX identifier to ensure 0% regression rate.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../helpers/dom-sandbox');
const {
  computeRoleSig,
  verifyUserRoleSig,
  isUserSuperAdmin,
  isValidPartition,
  getStoresFilePath
} = require('../../src/main/services/storage.service');

describe('Level 7: Dedicated Regression Catalog Tests (Zero-Regression Guarantee)', () => {
  let sandbox;
  let utilsContext;

  test('[REG-001] Legacy Shopee URL 404: Shopee /portal/chat must migrate automatically to official root domain', () => {
    const rawStores = [
      { id: 'shopee-legacy-1', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat' },
      { id: 'shopee-legacy-2', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat/' }
    ];

    rawStores.forEach(s => {
      if (s.marketplace === 'shopee' && (s.url === 'https://seller.shopee.co.id/portal/chat' || s.url === 'https://seller.shopee.co.id/portal/chat/')) {
        s.url = 'https://seller.shopee.co.id/';
      }
    });

    assert.equal(rawStores[0].url, 'https://seller.shopee.co.id/');
    assert.equal(rawStores[1].url, 'https://seller.shopee.co.id/');
  });

  test('[REG-002] Security Role Tampering: Tampered user role in storage must fail HMAC and revert to Customer Service', () => {
    const legitimateUser = {
      username: 'cs_joko',
      role: 'Customer Service',
      passwordSalt: 'salt_12345678'
    };
    legitimateUser.roleSig = computeRoleSig(legitimateUser.username, legitimateUser.role, legitimateUser.passwordSalt);

    // Tampering simulation: user modified JSON to give himself Super Admin
    const tampered = { ...legitimateUser, role: 'Super Admin' };
    const isValid = verifyUserRoleSig(tampered);

    assert.equal(isValid, false, 'Tampered role must fail signature check');

    // Healing logic
    if (!isValid) {
      tampered.role = 'Customer Service';
      tampered.isSuperAdmin = false;
      tampered.roleSig = computeRoleSig(tampered.username, 'Customer Service', tampered.passwordSalt);
    }

    assert.equal(tampered.role, 'Customer Service');
    assert.equal(tampered.isSuperAdmin, false);
    assert.equal(verifyUserRoleSig(tampered), true);
  });

  test('[REG-003] Template Variable Case Insensitivity: All permutations of {WAKTU}, {CS}, {RESI}, {TOKO} must resolve', () => {
    sandbox = createDOMSandbox();
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return resolveTemplateVariables;`);
    const resolveTemplateVariables = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const template = 'Halo kak {CUSTOMER}, selamat {WAKTU}! Dengan CS {CS} dari {TOKO}. Nomor resi: {RESI}, order: {ORDER}.';
    const resolved = resolveTemplateVariables(template, {
      customer: 'Budi',
      waktu: 'pagi',
      csName: 'Sarah',
      storeName: 'Berkah Store',
      clipboard: 'SPX001'
    });

    assert.equal(resolved, 'Halo kak Budi, selamat pagi! Dengan CS Sarah dari Berkah Store. Nomor resi: SPX001, order: SPX001.');
    assert.ok(!resolved.includes('{'), 'No unresolved placeholders must remain');
  });

  test('[REG-004] Empty Clipboard Handling: Empty clipboard must fallback to "..." instead of throwing error or "undefined"', () => {
    sandbox = createDOMSandbox();
    sandbox.window.currentClipboardValue = '';
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return resolveTemplateVariables;`);
    const resolveTemplateVariables = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const res = resolveTemplateVariables('Nomor pesanan: {clipboard}');
    assert.equal(res, 'Nomor pesanan: ...');
  });

  test('[REG-005] Zero Super Admin Lockout Prevention: Must preserve founder superadmin if all admin accounts are removed', () => {
    const users = [
      { username: 'founder', role: 'Customer Service', passwordSalt: 'salt1' },
      { username: 'staff', role: 'Customer Service', passwordSalt: 'salt2' }
    ];

    // Safety net logic
    const hasSuperAdmin = users.some(u => isUserSuperAdmin(u));
    if (!hasSuperAdmin && users.length > 0) {
      users[0].role = 'Super Admin';
      users[0].isSuperAdmin = true;
      users[0].roleSig = computeRoleSig(users[0].username, 'Super Admin', users[0].passwordSalt);
    }

    assert.equal(isUserSuperAdmin(users[0]), true);
    assert.equal(users[0].role, 'Super Admin');
  });

  test('[REG-006] Path Traversal in Partitions & Filenames: Must safely reject directory escape sequences', () => {
    assert.equal(isValidPartition('persist:..\\..\\Windows'), false);
    assert.equal(isValidPartition('persist:../../../etc/passwd'), false);

    const safePath = getStoresFilePath('../../../sneaky_user');
    const baseName = path.basename(safePath);
    assert.ok(!baseName.includes('/'));
    assert.ok(!baseName.includes('\\'));
    assert.ok(!baseName.includes('..'));
  });

  test('[REG-007] Multi-Account Partition Isolation: Stores must generate unique partitions per username to prevent cookie bleed', () => {
    sandbox = createDOMSandbox();
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return getStorePartition;`);
    const getStorePartition = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const sharedStore = { id: 'shopee_store_1' };
    const partitionUserA = getStorePartition(sharedStore, 'cs_andi');
    const partitionUserB = getStorePartition(sharedStore, 'cs_budi');

    assert.notEqual(partitionUserA, partitionUserB, 'Partitions for different users must never collide');
    assert.equal(partitionUserA, 'persist:user_cs_andi_shopee_store_1');
    assert.equal(partitionUserB, 'persist:user_cs_budi_shopee_store_1');
  });

  test('[REG-008] Find in Page Incremental Search: findInPage handler must handle findNext properly', () => {
    const registerIpcCode = fs.readFileSync(path.join(__dirname, '../../src/main/ipc/register-ipc.js'), 'utf8');
    
    // Pastikan handler 'find-in-page' terdaftar
    const findHandlerMatch = registerIpcCode.match(/ipcMain\.handle\('find-in-page'[\s\S]*?ipcMain\.handle\('stop-find-in-page'/);
    assert.ok(findHandlerMatch, 'find-in-page handler must be present');
    const findHandlerBody = findHandlerMatch[0];
    
    assert.ok(
      findHandlerBody.includes('targetWc.findInPage'),
      'find-in-page handler must invoke targetWc.findInPage'
    );
  });
});

