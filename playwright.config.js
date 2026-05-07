// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Config Playwright pour ASJE.
 * Démarre automatiquement le serveur PHP avant les tests.
 * Cross-platform : sur Windows utilise tools/php/php.exe, sur Linux php du PATH.
 *
 * Compte admin de test injecté via env vars (ADMIN_USER / ADMIN_PASS) pour
 * que les tests admin puissent se logger sans modifier la config locale.
 * Hash bcrypt pour le mot de passe "asje-test-2026".
 */
const localPhp = path.resolve(__dirname, 'tools', 'php', 'php.exe');
const TEST_ADMIN_USER = 'test-admin';
const TEST_ADMIN_PASS_HASH = '$2y$10$A5twE0Q/oyf2eOCy9joWQenqkAIiBT8rfQd0m6jxha.I8so6.zJby';

const phpCmd = process.env.CI
  ? 'php -S 127.0.0.1:8765 router.php'
  : `"${localPhp}" -c "${path.resolve(__dirname, 'tools', 'php', 'php.ini')}" -S 127.0.0.1:8765 router.php`;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Les tests admin partagent un état serveur (data/*.json), évite les conflits
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
    {
      name: 'mobile-small',
      use: { ...devices['iPhone SE'] }, // 375x667 — admin doit rester utilisable à cette taille
      testMatch: /admin\.spec\.js/, // Réservé aux tests admin (responsive critique)
    },
  ],

  // Démarre le serveur PHP avant les tests, le coupe après
  webServer: {
    command: phpCmd,
    url: 'http://127.0.0.1:8765/fr/',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: {
      ADMIN_USER: TEST_ADMIN_USER,
      ADMIN_PASS: TEST_ADMIN_PASS_HASH,
    },
  },
});
