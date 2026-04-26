// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Smoke test : vérifie que toutes les pages publiques répondent 200,
 * affichent leur titre et un footer. Détecte les régressions
 * massives type erreur PHP ou page blanche.
 */

const PAGES = [
  // FR
  { url: '/fr/', title: /ASJ Espelette/, lang: 'fr' },
  { url: '/fr/club.html', title: /Le Club/, lang: 'fr' },
  { url: '/fr/equipes.html', title: /Équipes|Equipes/, lang: 'fr' },
  { url: '/fr/agenda.html', title: /Agenda/, lang: 'fr' },
  { url: '/fr/galerie.html', title: /Galerie/, lang: 'fr' },
  { url: '/fr/partenaires.html', title: /Partenaires/, lang: 'fr' },
  { url: '/fr/contact.html', title: /Contact/, lang: 'fr' },
  { url: '/fr/mentions-legales.html', title: /Mentions/, lang: 'fr' },
  { url: '/fr/politique-cookies.html', title: /cookies/i, lang: 'fr' },

  // EUS
  { url: '/eu/', title: /ASJ Ezpeleta/, lang: 'eu' },
  { url: '/eu/kluba.html', title: /Kluba/, lang: 'eu' },
  { url: '/eu/taldeak.html', title: /Taldeak/, lang: 'eu' },
  { url: '/eu/egutegia.html', title: /Egutegia/, lang: 'eu' },
  { url: '/eu/argazkiak.html', title: /Argazkiak/, lang: 'eu' },
  { url: '/eu/bazkideak.html', title: /Bazkideak/, lang: 'eu' },
  { url: '/eu/harremanetan.html', title: /Harremanetan/, lang: 'eu' },
  { url: '/eu/lege-aipamenak.html', title: /Lege/, lang: 'eu' },
];

for (const page of PAGES) {
  test(`smoke: ${page.url}`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    p.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const url = msg.location()?.url || '';
        // Tolère les 404 sur ressources statiques (images placeholder, favicons, fonts)
        // qui ne sont pas encore fournies par le commanditaire
        if (/Failed to load resource/.test(text)) {
          if (/\.(jpg|jpeg|png|ico|gif|webp|svg|woff2?)(\?.*)?$/i.test(url)) return;
          if (/placeholder/.test(url)) return;
          // Endpoints PHP qui peuvent ne pas exister localement
          if (/\/admin\/(api|fff-proxy)\.php/.test(url) && !msg.text().includes('500')) return;
        }
        errors.push(`console: ${text} @ ${url}`);
      }
    });

    const response = await p.goto(page.url);
    expect(response, `Pas de réponse pour ${page.url}`).not.toBeNull();
    expect(response.status(), `Status non-200 pour ${page.url}`).toBe(200);

    // Titre attendu
    await expect(p).toHaveTitle(page.title);

    // Lang attribut
    const htmlLang = await p.locator('html').getAttribute('lang');
    expect(htmlLang).toBe(page.lang);

    // Header + footer présents
    await expect(p.locator('header.site-header')).toBeVisible();
    await expect(p.locator('footer.site-footer')).toBeVisible();

    // Pas d'erreur JS critique
    expect(errors, `Erreurs console détectées sur ${page.url}\n${errors.join('\n')}`).toEqual([]);
  });
}
