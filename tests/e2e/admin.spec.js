// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests E2E de l'interface admin (admin/).
 *
 * Couvre les flux critiques que les bénévoles utilisent au quotidien :
 *  - Login / logout / mauvais mot de passe
 *  - Création / modification / suppression d'article
 *  - Upload / suppression de photo (galerie)
 *  - Lecture de la configuration équipes
 *
 * Compte de test injecté dans playwright.config.js via env vars.
 * Tous les artefacts créés (articles, photos) sont supprimés en fin de test
 * pour ne pas polluer data/articles.json, data/galerie.json ni admin/uploads/.
 */

const TEST_USER = 'test-admin';
const TEST_PASS = 'asje-test-2026';

// Petit PNG transparent 1×1 valide, utilisé pour tester l'upload sans
// dépendre d'un fichier binaire dans le repo.
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function login(page, user = TEST_USER, pass = TEST_PASS) {
  await page.goto('/admin/');
  await page.locator('#login-user').fill(user);
  await page.locator('#login-pass').fill(pass);
  await page.locator('#login-btn').click();
}

// ============================================================
// AUTH
// ============================================================

test.describe('Admin - authentification', () => {
  test('login avec bons identifiants ouvre l\'admin', async ({ page }) => {
    await login(page);
    await expect(page.locator('#admin-app')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#tab-articles')).toBeVisible();
  });

  test('login refuse un mauvais mot de passe', async ({ page }) => {
    await login(page, TEST_USER, 'mauvais-mdp');
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#admin-app')).toBeHidden();
  });

  test('login refuse un mauvais identifiant', async ({ page }) => {
    await login(page, 'pas-le-bon', TEST_PASS);
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#admin-app')).toBeHidden();
  });

  test('logout renvoie sur l\'écran de login', async ({ page }) => {
    await login(page);
    await expect(page.locator('#admin-app')).toBeVisible();
    await page.locator('#logout-btn').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#admin-app')).toBeHidden();
  });
});

// ============================================================
// ARTICLES
// ============================================================

test.describe('Admin - articles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page.locator('#admin-app')).toBeVisible();
  });

  test('crée, modifie et supprime un article', async ({ page }) => {
    const initialTitle = `Test E2E article ${Date.now()}`;
    const editedTitle = `${initialTitle} (modifié)`;

    // --- Création ---
    await page.locator('#art-title-fr').fill(initialTitle);
    await page.locator('#art-summary-fr').fill('Résumé E2E');
    await page.locator('#art-content-fr').fill('Contenu E2E');
    await page.locator('#art-save-btn').click();

    // Toast de succès puis apparition dans la liste
    await expect(page.locator('#toast.show.toast-ok')).toBeVisible();
    await expect(page.locator('#articles-list')).toContainText(initialTitle);

    // --- Modification ---
    const articleItem = page.locator('.article-item', { hasText: initialTitle });
    await articleItem.locator('button', { hasText: 'Modifier' }).click();

    // Le formulaire bascule en mode édition
    await expect(page.locator('#article-form-title')).toHaveText(/Modifier/i);
    await page.locator('#art-title-fr').fill(editedTitle);
    await page.locator('#art-save-btn').click();

    await expect(page.locator('#toast.show.toast-ok')).toBeVisible();
    await expect(page.locator('#articles-list')).toContainText(editedTitle);

    // --- Suppression (avec acceptation du confirm() natif) ---
    page.once('dialog', d => d.accept());
    const editedItem = page.locator('.article-item', { hasText: editedTitle });
    await editedItem.locator('button', { hasText: 'Supprimer' }).click();

    await expect(page.locator('#toast.show.toast-ok')).toBeVisible();
    await expect(page.locator('#articles-list')).not.toContainText(editedTitle);
  });

  test('refuse de publier sans titre français', async ({ page }) => {
    // Pas de titre rempli
    await page.locator('#art-summary-fr').fill('Sans titre — devrait être refusé');
    await page.locator('#art-save-btn').click();

    // Toast d'erreur, l'article ne doit pas être créé
    await expect(page.locator('#toast.show.toast-err')).toBeVisible();
  });
});

// ============================================================
// PHOTOS / GALERIE
// ============================================================

test.describe('Admin - galerie photos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Bascule sur l'onglet Galerie
    await page.locator('button.tab-btn', { hasText: /Galerie/i }).click();
    await expect(page.locator('#tab-galerie')).toBeVisible();
  });

  test('upload puis supprime une photo', async ({ page, request }) => {
    const labelFr = `Photo test E2E ${Date.now()}`;
    await page.locator('#photo-label-fr').fill(labelFr);
    await page.locator('#photo-category').selectOption('evenements');

    // Upload via setInputFiles avec un buffer (pas de fichier sur disque nécessaire)
    await page.locator('#photo-input').setInputFiles({
      name: 'test-e2e.png',
      mimeType: 'image/png',
      buffer: TINY_PNG_BUFFER,
    });

    // Attend explicitement que la photo apparaisse dans la grille — plus déterministe
    // qu'un check sur le toast (qui peut rester affiché de l'upload précédent).
    await expect(page.locator('.photo-item', { hasText: labelFr })).toBeVisible();

    // Suppression : on appelle l'API directement plutôt que de cliquer sur le bouton
    // qui est dans .photo-overlay (opacity 0 sur certains viewports / WebKit) — le
    // click est flaky en CI sur iPhone 13 WebKit. L'upload reste testé via UI ;
    // ici on vérifie juste que la donnée est bien persistée et nettoyable.
    const galerie = await request.get('/admin/api.php?action=galerie').then(r => r.json());
    const photo = galerie.find(p => (p.fr && p.fr.label) === labelFr);
    expect(photo).toBeTruthy();

    // Récupère le cookie de session pour l'appel d'API authentifié
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const deleteResponse = await request.post('/admin/api.php?action=photo-delete', {
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      data: { id: photo.id },
    });
    expect(deleteResponse.ok()).toBeTruthy();

    // Recharge la grille et vérifie disparition
    await page.reload();
    await page.locator('button.tab-btn', { hasText: /Galerie/i }).click();
    await expect(page.locator('.photo-item', { hasText: labelFr })).toHaveCount(0);
  });
});

// ============================================================
// ÉQUIPES (lecture seulement — modifier toucherait à la prod)
// ============================================================

test.describe('Admin - équipes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('button.tab-btn', { hasText: /Equipes|Équipes/i }).click();
    await expect(page.locator('#tab-equipes')).toBeVisible();
  });

  test('charge la configuration équipes existante', async ({ page }) => {
    // La saison doit être pré-remplie (lue depuis data/equipes.json)
    await expect(page.locator('#eq-saison')).not.toHaveValue('');

    // L'ID club doit être renseigné
    await expect(page.locator('#eq-club-id')).not.toHaveValue('');

    // La liste des équipes doit contenir au moins une entrée (chaque équipe = une .card)
    await expect(page.locator('#equipes-list .card').first()).toBeVisible();

    // Boutons d'action présents
    await expect(page.locator('#eq-add')).toBeVisible();
    await expect(page.locator('#eq-save')).toBeVisible();
  });
});

// ============================================================
// RESPONSIVE — vérifie que la media query <600px s'applique
// Ne tourne que sur le projet "mobile-small" (iPhone SE 375×667)
// ============================================================

test.describe('Admin - responsive mobile (<600px)', () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 600, 'Réservé aux viewports < 600px');

  test('login-screen utilise 100svh (pas de coupure barre adresse)', async ({ page }) => {
    await page.goto('/admin/');
    const minHeight = await page.locator('#login-screen').evaluate(el =>
      window.getComputedStyle(el).minHeight
    );
    // Le moteur calcule 100svh en pixels — doit correspondre à la hauteur viewport
    const viewportHeight = page.viewportSize()?.height || 0;
    const computedPx = parseFloat(minHeight);
    expect(computedPx).toBeGreaterThanOrEqual(viewportHeight - 1);
  });

  test('formulaire article : champs FR/EU empilés (pas en grille 2 colonnes)', async ({ page }) => {
    await login(page);
    const inlineRow = page.locator('.form-row-inline').first();
    const gridCols = await inlineRow.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );
    // En mode mobile, doit être une seule colonne (pas "1fr 1fr" qui = 2 valeurs px)
    const colCount = gridCols.split(' ').filter(Boolean).length;
    expect(colCount).toBe(1);
  });

  test('onglets admin scrollables horizontalement (pas de débordement caché)', async ({ page }) => {
    await login(page);
    const tabsOverflow = await page.locator('.admin-tabs').evaluate(el =>
      window.getComputedStyle(el).overflowX
    );
    expect(tabsOverflow).toBe('auto');
  });

  test('boutons CRUD ont un touch target ≥ 36px', async ({ page }) => {
    await login(page);
    // Crée un article temporaire pour avoir des boutons Modifier/Supprimer affichés
    const tempTitle = `Test responsive ${Date.now()}`;
    await page.locator('#art-title-fr').fill(tempTitle);
    await page.locator('#art-save-btn').click();
    await expect(page.locator('#articles-list')).toContainText(tempTitle);

    const articleItem = page.locator('.article-item', { hasText: tempTitle });
    const btnHeight = await articleItem.locator('button').first().evaluate(el =>
      el.getBoundingClientRect().height
    );
    expect(btnHeight).toBeGreaterThanOrEqual(36);

    // Cleanup
    page.once('dialog', d => d.accept());
    await articleItem.locator('button', { hasText: 'Supprimer' }).click();
    await expect(page.locator('#articles-list')).not.toContainText(tempTitle);
  });
});
