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

  test('should open, switch tabs, minimize and close Feedback modal without errors', async () => {
    sandbox.window.addEventListener = (ev, fn) => {};
    sandbox.window.removeEventListener = (ev, fn) => {};
    sandbox.window.electronAPI = {
      feedback: {
        getTickets: async () => [],
        getTicket: async () => ({ success: true, ticket: {} }),
        sync: async () => ({ success: true }),
        getUnreadCount: async () => 0
      }
    };

    const feedbackModal = new MockElement('div', 'feedback-modal');
    const dockPill = new MockElement('div', 'feedback-dock-pill');
    const tabBtnHistory = new MockElement('button', 'tab-btn-feedback-history');
    const tabBtnNew = new MockElement('button', 'tab-btn-feedback-new');
    const panelHistory = new MockElement('div', 'feedback-panel-history');
    const panelNew = new MockElement('div', 'feedback-panel-new');
    const titleEl = new MockElement('div', 'feedback-modal-title');
    const fMsg = new MockElement('textarea', 'feedback-message');
    const fType = new MockElement('select', 'feedback-type');

    sandbox.document.registerElement('feedback-modal', feedbackModal);
    sandbox.document.registerElement('feedback-dock-pill', dockPill);
    sandbox.document.registerElement('tab-btn-feedback-history', tabBtnHistory);
    sandbox.document.registerElement('tab-btn-feedback-new', tabBtnNew);
    sandbox.document.registerElement('feedback-panel-history', panelHistory);
    sandbox.document.registerElement('feedback-panel-new', panelNew);
    sandbox.document.registerElement('feedback-modal-title', titleEl);
    sandbox.document.registerElement('feedback-message', fMsg);
    sandbox.document.registerElement('feedback-type', fType);

    const feedbackCode = fs.readFileSync(path.join(__dirname, '../../../js/feedback.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', 'getEl', 'escapeHtml', 'formatDateDisplay', feedbackCode);
    fn(sandbox.window, sandbox.document, sandbox.localStorage, (id) => sandbox.document.getElementById(id), (s) => s, (d) => d);

    // Open modal
    sandbox.window.openFeedbackModal();
    assert.equal(feedbackModal.classList.contains('active'), true, 'Feedback modal must be active when opened');

    // Switch to history tab
    sandbox.window.switchFeedbackTab('history');
    assert.equal(panelHistory.classList.contains('active'), true);
    assert.equal(panelNew.classList.contains('active'), false);

    // Switch to new tab
    sandbox.window.switchFeedbackTab('new');
    assert.equal(panelNew.classList.contains('active'), true);
    assert.equal(panelHistory.classList.contains('active'), false);

    // Close modal
    sandbox.window.closeFeedbackModal();
    assert.equal(feedbackModal.classList.contains('active'), false, 'Feedback modal must be inactive when closed');
  });
});
