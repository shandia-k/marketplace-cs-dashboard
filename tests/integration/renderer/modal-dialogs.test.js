/**
 * tests/integration/renderer/modal-dialogs.test.js
 * Integration testing for confirmation dialogs and danger zone verification
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox, MockElement } = require('../../helpers/dom-sandbox');

describe('Level 5: Renderer Modal & Confirmation Dialog Tests', () => {
  let sandbox;
  let showConfirmDialog;

  beforeEach(() => {
    sandbox = createDOMSandbox();
    
    const overlay = new MockElement('div', 'confirm-modal-overlay');
    const titleEl = new MockElement('div', 'confirm-modal-title');
    const msgEl = new MockElement('div', 'confirm-modal-message');
    const iconEl = new MockElement('div', 'confirm-modal-icon');
    const btnCancel = new MockElement('button', 'btn-confirm-cancel');
    const btnConfirm = new MockElement('button', 'btn-confirm-ok');
    const inputGroup = new MockElement('div', 'confirm-modal-input-group');
    const inputField = new MockElement('input', 'confirm-modal-input');
    const inputHint = new MockElement('div', 'confirm-modal-input-hint');

    sandbox.document.registerElement('confirm-modal-overlay', overlay);
    sandbox.document.registerElement('confirm-modal-title', titleEl);
    sandbox.document.registerElement('confirm-modal-message', msgEl);
    sandbox.document.registerElement('confirm-modal-icon', iconEl);
    sandbox.document.registerElement('btn-confirm-cancel', btnCancel);
    sandbox.document.registerElement('btn-confirm-ok', btnConfirm);
    sandbox.document.registerElement('confirm-modal-input-group', inputGroup);
    sandbox.document.registerElement('confirm-modal-input', inputField);
    sandbox.document.registerElement('confirm-modal-input-hint', inputHint);

    const utilsCode = fs.readFileSync(path.join(__dirname, '../../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return showConfirmDialog;`);
    showConfirmDialog = fn(sandbox.window, sandbox.document, sandbox.localStorage);
  });

  test('should resolve true when confirm button is clicked', async () => {
    const dialogPromise = showConfirmDialog({
      title: 'Hapus Toko',
      message: 'Apakah Anda yakin ingin menghapus toko ini?',
      type: 'danger'
    });

    const overlay = sandbox.document.getElementById('confirm-modal-overlay');
    assert.equal(overlay.classList.contains('active'), true);

    const btnConfirm = sandbox.document.getElementById('btn-confirm-ok');
    assert.equal(typeof btnConfirm.onclick, 'function');
    btnConfirm.onclick({ preventDefault: () => {} });

    const result = await dialogPromise;
    assert.equal(result, true);
    assert.equal(overlay.classList.contains('active'), false);
  });

  test('should resolve false when cancel button is clicked', async () => {
    const dialogPromise = showConfirmDialog({
      title: 'Batal Tindakan',
      message: 'Tindakan ini dibatalkan.',
      type: 'info'
    });

    const btnCancel = sandbox.document.getElementById('btn-confirm-cancel');
    btnCancel.onclick({ preventDefault: () => {} });

    const result = await dialogPromise;
    assert.equal(result, false);
  });

  test('should enforce requireText danger zone keyword before enabling confirm button', async () => {
    const dialogPromise = showConfirmDialog({
      title: 'Reset Total Database',
      message: 'Semua data akan dihapus permanen!',
      type: 'critical',
      requireText: 'HAPUS'
    });

    const btnConfirm = sandbox.document.getElementById('btn-confirm-ok');
    const inputField = sandbox.document.getElementById('confirm-modal-input');

    // Initially disabled
    assert.equal(btnConfirm.disabled, true);

    // Typing wrong keyword
    inputField.value = 'HAP';
    inputField.oninput();
    assert.equal(btnConfirm.disabled, true);

    // Typing correct keyword (case-insensitive)
    inputField.value = 'hapus';
    inputField.oninput();
    assert.equal(btnConfirm.disabled, false);

    btnConfirm.onclick({ preventDefault: () => {} });
    const result = await dialogPromise;
    assert.equal(result, true);
  });
});
