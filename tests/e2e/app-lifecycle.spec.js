/**
 * tests/e2e/app-lifecycle.spec.js
 * End-to-End Testing (Puncak Piramida Testing)
 * Menguji peluncuran aplikasi Electron nyata, title bar, frame controls, dan lifecycle
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('E2E: Application Lifecycle & Window Shell', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch real Electron application instance
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Capture first BrowserWindow
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should launch electron app with custom titlebar and correct page title', async () => {
    const title = await window.title();
    expect(title).toBe('CS Marketplace Dashboard');

    const titlebar = await window.$('#titlebar');
    expect(titlebar).not.toBeNull();

    const isVisible = await titlebar.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should render window frame controls (minimize, maximize, close, theme toggle)', async () => {
    const btnThemeToggle = await window.$('#btn-theme-toggle');
    const btnMinimize = await window.$('#btn-minimize');
    const btnMaximize = await window.$('#btn-maximize');
    const btnClose = await window.$('#btn-close');

    expect(btnThemeToggle).not.toBeNull();
    expect(btnMinimize).not.toBeNull();
    expect(btnMaximize).not.toBeNull();
    expect(btnClose).not.toBeNull();
  });

  test('should toggle theme when clicking theme toggle button', async () => {
    const btnThemeToggle = await window.$('#btn-theme-toggle');
    const initialTheme = await window.evaluate(() => localStorage.getItem('theme') || 'dark');

    // Click theme toggle
    await btnThemeToggle.click();
    await window.waitForTimeout(200);

    const toggledTheme = await window.evaluate(() => localStorage.getItem('theme'));
    expect(toggledTheme).not.toBe(initialTheme);
  });

  test('should display login screen or main dashboard container', async () => {
    const loginLayout = await window.$('#login-layout');
    const appLayout = await window.$('#app-layout');
    
    // Either login screen or app dashboard must be present in the DOM
    expect(loginLayout !== null || appLayout !== null).toBe(true);
  });
});
