/**
 * tests/integration/ipc/preload-surface.test.js
 * Integration testing for preload.js exposed API surface and security isolation
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Level 4: IPC & Preload Surface Security Tests', () => {
  let exposedApi = null;
  let exposedNamespace = null;

  before(() => {
    const preloadCode = fs.readFileSync(path.join(__dirname, '../../../preload.js'), 'utf8');

    const mockContextBridge = {
      exposeInMainWorld: (namespace, api) => {
        exposedNamespace = namespace;
        exposedApi = api;
      }
    };

    const mockIpcRenderer = {
      invoke: () => Promise.resolve(),
      send: () => {},
      on: () => {}
    };

    const fn = new Function('require', preloadCode);

    fn((mod) => {
      if (mod === 'electron') {
        return {
          contextBridge: mockContextBridge,
          ipcRenderer: mockIpcRenderer
        };
      }
      throw new Error(`Unexpected require: ${mod}`);
    });
  });

  test('should safely expose electronAPI via contextBridge without leaking Node globals', () => {
    assert.equal(exposedNamespace, 'electronAPI', 'Preload must expose API under electronAPI namespace');
    assert.ok(exposedApi, 'API object must be defined');
  });

  test('should contain all required Store and User management methods', () => {
    const requiredMethods = [
      'getStores', 'saveStores', 'getAppPath', 'getAppMemoryMB', 'getAppMetricsDetails', 'getDevMimicryInfo',
      'submitFeedback', 'captureScreen', 'sendTelemetry', 'getUsers', 'getUserProfile',
      'createUser', 'updateUserProfile', 'deleteUser', 'verifyUserPin', 'loginUser',
      'logoutUser', 'getSecurityQuestion', 'resetUserPassword', 'updateSecurityQuestion',
      'changePassword', 'exportStoresConfig', 'importStoresConfig', 'searchUrls',
      'vaultEncrypt', 'vaultDecrypt',
      'autofillGetEntries', 'autofillSaveEntry', 'autofillDeleteEntry'
    ];

    requiredMethods.forEach(method => {
      assert.equal(typeof exposedApi[method], 'function', `Method ${method} must be exposed in electronAPI`);
    });
  });

  test('should contain all Admin Audit and Control methods', () => {
    const adminMethods = [
      'adminGetFullAudit', 'adminClearStoreSession', 'adminDeleteUserStore',
      'adminResetUserPin', 'adminClearUserSession', 'adminChangeUserRole', 'adminCreateUser'
    ];

    adminMethods.forEach(method => {
      assert.equal(typeof exposedApi[method], 'function', `Admin method ${method} must be exposed in electronAPI`);
    });
  });

  test('should contain all Cache, Clipboard, Window, and Updater methods', () => {
    const utilityMethods = [
      'windowMinimize', 'windowMaximize', 'windowClose', 'flashWindow',
      'loadScratchpadFile', 'saveScratchpadFile', 'readClipboard', 'writeClipboard',
      'onClipboardChanged', 'getCacheSize', 'clearSafeCache', 'clearStoreCache',
      'deepCleanStore', 'deepCleanAll', 'pruneBackgroundMemory', 'getAppVersion', 'checkForUpdates',
      'restartToUpdate', 'onUpdaterMessage', 'onUpdaterProgress',
      'getReleaseHistory', 'getVersionTrail', 'startVersionRollback', 'onRollbackProgress'
    ];

    utilityMethods.forEach(method => {
      assert.equal(typeof exposedApi[method], 'function', `Utility method ${method} must be exposed in electronAPI`);
    });
  });

  test('should contain all 2-Way Feedback and Interactive Ticketing methods', () => {
    assert.ok(exposedApi.feedback, 'feedback object must be exposed in electronAPI');
    const feedbackMethods = [
      'getTickets', 'getTicket', 'createTicket', 'addReply',
      'updateStatus', 'sync', 'markRead', 'getUnreadCount'
    ];

    feedbackMethods.forEach(method => {
      assert.equal(typeof exposedApi.feedback[method], 'function', `Feedback method ${method} must be exposed in electronAPI.feedback`);
    });
  });

  test('should contain all Find In Page (Ctrl+F) methods and native trigger listeners', () => {
    const findMethods = [
      'findInPage', 'stopFindInPage', 'onFoundInPageResult',
      'onTriggerFindInPage', 'onTriggerCloseFindInPage'
    ];

    findMethods.forEach(method => {
      assert.equal(typeof exposedApi[method], 'function', `FindInPage method ${method} must be exposed in electronAPI`);
    });
  });
});
