// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Config Playwright pour ASJE.
 * Démarre automatiquement le serveur PHP avant les tests.
 * Cross-platform : sur Windows utilise tools/php/php.exe, sur Linux php du PATH.
 */
const localPhp = path.resolve(__dirname, 'tools', 'php', 'php.exe');
const phpCmd = process.env.CI
  ? 'php -S 127.0.0.1:8765 router.php'
  : `"${localPhp}" -c "${path.resolve(__dirname, 'tools', 'php', 'php.ini')}" -S 127.0.0.1:8765 router.php`;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Démarre le serveur PHP avant les tests, le coupe après
  webServer: {
    command: phpCmd,
    url: 'http://127.0.0.1:8765/fr/',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
