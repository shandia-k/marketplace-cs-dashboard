// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright E2E Configuration for Electron Desktop App
 * @see https://playwright.dev/docs/api/class-electron
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1, // Run serially to avoid window port/lock conflicts
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
