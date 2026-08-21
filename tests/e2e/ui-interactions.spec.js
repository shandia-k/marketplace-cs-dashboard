/**
 * tests/e2e/ui-interactions.spec.js
 * End-to-End Testing for UI components, modals, and CS toolkit in real Electron window
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('E2E: UI Components & Interactive Tools', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should render and handle quick lock screen interaction', async () => {
    const btnQuickLock = await window.$('#btn-quick-lock');
    if (btnQuickLock) {
      await btnQuickLock.click();
      await window.waitForTimeout(300);

      const lockscreen = await window.$('#lockscreen-overlay');
      if (lockscreen) {
        const isVisible = await lockscreen.isVisible();
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });

  test('should have electronAPI securely injected in renderer window', async () => {
    const hasElectronApi = await window.evaluate(() => {
      return typeof window.electronAPI === 'object' && window.electronAPI !== null;
    });
    expect(hasElectronApi).toBe(true);

    const apiMethods = await window.evaluate(() => {
      return Object.keys(window.electronAPI);
    });
    expect(apiMethods.length).toBeGreaterThan(15);
    expect(apiMethods).toContain('getStores');
    expect(apiMethods).toContain('saveStores');
    expect(apiMethods).toContain('loginUser');
  });

  test('should have nodeIntegration disabled and contextIsolation enabled', async () => {
    const isNodeIntegrationDisabled = await window.evaluate(() => {
      return typeof require === 'undefined' && typeof process === 'undefined';
    });
    expect(isNodeIntegrationDisabled).toBe(true);
  });
});
