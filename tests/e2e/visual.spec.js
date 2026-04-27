// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests de régression visuelle.
 *
 * Capture des screenshots des pages critiques et compare au baseline
 * stocké dans tests/e2e/__screenshots__/. À la première exécution
 * (ou lors d'un changement intentionnel), Playwright crée/met à jour
 * le baseline.
 *
 * Pour mettre à jour les baselines après un changement visuel
 * intentionnel :
 *   npm run test:visual:update
 *
 * Pour voir les diffs après un échec :
 *   npx playwright show-report
 *
 * Tolérance : 0.2% de pixels différents (couvre le rendu sub-pixel des
 * fonts entre runners). Désactive les animations CSS pour des
 * captures déterministes.
 */

const PAGES = [
  { url: '/fr/', name: 'home-fr' },
  { url: '/fr/club.html', name: 'club-fr' },
  { url: '/fr/equipes.html', name: 'equipes-fr' },
  { url: '/fr/agenda.html', name: 'agenda-fr', wait: '#fff-classement table' },
  { url: '/fr/galerie.html', name: 'galerie-fr' },
  { url: '/fr/partenaires.html', name: 'partenaires-fr' },
  { url: '/fr/contact.html', name: 'contact-fr' },
  { url: '/eu/', name: 'home-eu' },
  { url: '/eu/egutegia.html', name: 'agenda-eu', wait: '#fff-classement table' },
];

test.describe('Visual regression — desktop', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual sur chromium uniquement');

  for (const page of PAGES) {
    test(`${page.name} desktop`, async ({ page: p }) => {
      await p.goto(page.url);
      // Désactive les animations pour stabilité
      await p.addStyleTag({ content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }` });
      // Ferme le bandeau cookies pour éviter qu'il pollue les captures
      await p.evaluate(() => localStorage.setItem('asje-cookie-consent', 'accepted'));
      await p.reload();
      if (page.wait) {
        await p.waitForSelector(page.wait, { timeout: 20000 }).catch(() => null);
      } else {
        await p.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
      }
      // Délai supplémentaire pour FOUT (Roboto Flex)
      await p.waitForTimeout(500);
      await expect(p).toHaveScreenshot(`${page.name}-desktop.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.002,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Visual regression — mobile', () => {
  test.skip(({ browserName }) => browserName === 'chromium', 'Mobile = projet "mobile" (iPhone 13)');

  for (const page of PAGES) {
    test(`${page.name} mobile`, async ({ page: p }) => {
      await p.goto(page.url);
      await p.addStyleTag({ content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }` });
      await p.evaluate(() => localStorage.setItem('asje-cookie-consent', 'accepted'));
      await p.reload();
      if (page.wait) {
        await p.waitForSelector(page.wait, { timeout: 20000 }).catch(() => null);
      } else {
        await p.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
      }
      await p.waitForTimeout(500);
      await expect(p).toHaveScreenshot(`${page.name}-mobile.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.002,
        animations: 'disabled',
      });
    });
  }
});
