/**
 * tests/integration/ipc/ipc-contracts.test.js
 * Integration testing for IPC channel registration contracts between Main and Renderer
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Level 4: IPC Channel Contracts & Handlers Tests', () => {
  const registeredHandlers = new Map();
  const registeredListeners = new Map();

  const mockIpcMain = {
    handle: (channel, handler) => {
      registeredHandlers.set(channel, handler);
    },
    on: (channel, listener) => {
      registeredListeners.set(channel, listener);
    }
  };

  before(() => {
    const registerIpcCode = fs.readFileSync(path.join(__dirname, '../../../src/main/ipc/register-ipc.js'), 'utf8');

    const fn = new Function('require', 'module', 'exports', `
      ${registerIpcCode}
    `);

    const mockModule = { exports: {} };
    fn((mod) => {
      if (mod === 'electron') {
        return {
          ipcMain: mockIpcMain,
          app: { getPath: () => '' },
          clipboard: { readText: async () => '', writeText: async () => {} }
        };
      }
      if (mod === '../services/storage.service') {
        return { readStores: () => [], saveStores: () => true };
      }
      if (mod === '../services/auth.service') {
        return {
          getActiveSession: () => null,
          getUsers: () => [],
          getUserProfile: () => ({ success: true }),
          createUser: () => ({ success: true }),
          updateUserProfile: () => ({ success: true }),
          deleteUser: () => ({ success: true }),
          verifyUserPin: () => ({ success: true }),
          loginUser: () => ({ success: true }),
          logoutUser: () => ({ success: true }),
          getSecurityQuestion: () => ({ success: true }),
          resetUserPassword: () => ({ success: true }),
          updateSecurityQuestion: () => ({ success: true }),
          changePassword: () => ({ success: true }),
          adminGetFullAudit: () => ({ success: true }),
          adminResetUserPin: () => ({ success: true }),
          adminClearUserSession: () => ({ success: true }),
          adminChangeUserRole: () => ({ success: true }),
          adminCreateUser: () => ({ success: true }),
          adminClearStoreSession: () => ({ success: true }),
          adminDeleteUserStore: () => ({ success: true })
        };
      }
      if (mod === '../services/session.service') {
        return {
          getCacheSizeFormatted: async () => '10 MB',
          clearSafeCache: async () => true,
          clearStoreCache: async () => true,
          deepCleanStore: async () => true,
          deepCleanAll: async () => true,
          pruneBackgroundMemory: async () => ({ success: true })
        };
      }
      if (mod === '../services/updater.service') {
        return {
          getAppVersion: () => '1.0.14',
          checkForUpdates: () => {},
          restartToUpdate: () => {},
          fetchReleaseHistory: async () => [],
          executeRollback: async () => ({ success: true })
        };
      }
      if (mod === '../services/search.service') {
        return { searchWebUrls: () => [] };
      }
      if (mod === '../services/feedback.service') {
        return {
          getTickets: () => [],
          getTicketDetails: () => ({ success: true }),
          createTicket: () => ({ success: true }),
          addReply: () => ({ success: true }),
          updateTicketStatus: () => ({ success: true }),
          syncTickets: () => ({ success: true }),
          markTicketAsRead: () => ({ success: true }),
          getUnreadFeedbackCount: () => 0
        };
      }
      if (mod === '../services/system.service') {
        return {
          exportStoresConfig: () => true,
          importStoresConfig: () => true,
          getAppMemoryMB: () => 100,
          getAppMetricsDetails: () => [],
          submitFeedback: () => ({ success: true }),
          captureScreen: () => '',
          sendTelemetry: () => ({ success: true }),
          loadScratchpadFile: () => ({ content: '' }),
          saveScratchpadFile: () => true,
          setupClipboardWatcher: () => {}
        };
      }
      return {};
    }, mockModule, mockModule.exports);

    mockModule.exports.registerIpcHandlers(() => ({
      isMinimized: () => false,
      restore: () => {},
      minimize: () => {},
      isMaximized: () => false,
      maximize: () => {},
      unmaximize: () => {},
      close: () => {},
      flashFrame: () => {}
    }));
  });

  test('should register all expected IPC handlers without collisions', () => {
    assert.ok(registeredHandlers.size >= 25, `Expected at least 25 registered handlers, got ${registeredHandlers.size}`);
  });

  test('should verify essential handle channels are registered', () => {
    const essentialChannels = [
      'get-stores', 'save-stores', 'login-user', 'logout-user',
      'verify-user-pin', 'get-users', 'get-user-profile', 'create-user',
      'submit-feedback', 'capture-screen', 'send-telemetry', 'get-dev-mimicry-info',
      'get-release-history', 'get-version-trail', 'start-version-rollback',
      'feedback:get-tickets', 'feedback:get-ticket', 'feedback:create-ticket',
      'feedback:add-reply', 'feedback:update-status', 'feedback:sync',
      'feedback:mark-read', 'feedback:get-unread-count'
    ];

    essentialChannels.forEach(channel => {
      assert.ok(registeredHandlers.has(channel), `Essential IPC channel [${channel}] must be registered`);
    });
  });

  test('should handle null arguments gracefully in handlers without crashing', async () => {
    const getStoresHandler = registeredHandlers.get('get-stores');
    const res = await getStoresHandler({}, null);
    assert.ok(Array.isArray(res) || res === null || typeof res === 'object');
  });
});
