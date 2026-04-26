// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests fonctionnels de la page agenda — composants critiques :
 * - Hero match card chargé depuis la FFF
 * - Chips équipes (au moins Senior 1)
 * - Sous-tabs Précédent / Ce week-end / Suivant
 * - Switch sur "Précédent" affiche le bilan + les matchs joués
 * - Tableau classement avec ligne ASJE surlignée
 */

test.describe('Agenda FR', () => {
  test('hero + chips + sous-tabs présents', async ({ page }) => {
    await page.goto('/fr/agenda.html');

    // Hero
    await expect(page.locator('#fff-hero')).toBeVisible();

    // Chips équipes (au moins Senior 1)
    await expect(page.locator('#fff-equipe-tabs .fff-tab').first()).toBeVisible({ timeout: 15000 });

    // Sous-tabs (3 boutons)
    const subtabs = page.locator('#fff-subview-tabs .view-tab');
    await expect(subtabs).toHaveCount(3);
    await expect(subtabs.nth(0)).toContainText(/Précédent/);
    await expect(subtabs.nth(1)).toContainText(/week-end/);
    await expect(subtabs.nth(2)).toContainText(/Suivant/);
  });

  test('clic sur Précédent affiche le bilan saison', async ({ page }) => {
    await page.goto('/fr/agenda.html');
    await page.locator('#fff-equipe-tabs .fff-tab').first().waitFor({ timeout: 15000 });

    await page.locator('#fff-subview-tabs .view-tab', { hasText: /Précédent/ }).click();

    // Le bilan saison apparaît
    const bilan = page.locator('.fff-bilan');
    await expect(bilan).toBeVisible({ timeout: 5000 });
    await expect(bilan).toContainText(/matchs joués/);
  });

  test('classement chargé avec ligne ASJE surlignée', async ({ page }) => {
    await page.goto('/fr/agenda.html');
    await page.locator('#fff-classement table').waitFor({ timeout: 20000 });

    // Au moins une ligne dans le tableau classement
    const rows = page.locator('.fff-classement-table tbody tr');
    await expect(rows.first()).toBeVisible();

    // Une des lignes contient ESPELETTE et a la classe is-asje
    const asjeRow = page.locator('.fff-classement-table tbody tr.is-asje');
    await expect(asjeRow).toContainText(/ESPELETTE/i);
  });
});

test.describe('Switch FR ↔ EUS', () => {
  test('lien EUS de la home FR redirige vers /eu/', async ({ page }) => {
    await page.goto('/fr/');
    const eusLink = page.locator('.lang-switch a:has-text("EUS")');
    await expect(eusLink).toHaveAttribute('href', '/eu/');
    await eusLink.click();
    await expect(page).toHaveURL(/\/eu\/$/);
    await expect(page).toHaveTitle(/Ezpeleta/);
  });

  test('switch FR↔EUS sur agenda préserve le contexte', async ({ page }) => {
    await page.goto('/fr/agenda.html');
    await page.locator('.lang-switch a:has-text("EUS")').click();
    await expect(page).toHaveURL(/\/eu\/egutegia\.html$/);
  });
});

test.describe('Carousel news (home)', () => {
  test('carousel chargé avec au moins une card', async ({ page }) => {
    await page.goto('/fr/');
    const carousel = page.locator('.news-carousel');
    await expect(carousel).toBeVisible();

    const cards = page.locator('.news-carousel .news-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });
});
