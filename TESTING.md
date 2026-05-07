# Tests, lint et qualité — Site ASJ Espelette

Ce document décrit la pipeline de validation mise en place pour minimiser
les régressions et évaluer l'impact de chaque changement.

## Vue d'ensemble

| Pilier | Outil | Quand | Bloquant ? |
|---|---|---|---|
| **1. Lint statique** | `scripts/lint.sh` | Local + CI sur chaque PR | Oui |
| **2. Tests E2E** | Playwright (`tests/e2e/`) | Local + CI sur chaque PR | Oui |
| **3. Analyse d'impact** | `scripts/impact.py` | CI : commentaire PR | Non |
| **4. Visual regression** | `tests/e2e/visual.spec.js` | CI sur PR | Oui |
| **+ Hooks Git locaux** | `scripts/hooks/` | Pre-commit + pre-push | Oui (bypass `--no-verify`) |

## Validation locale en une commande

Avant de pousser une PR, lance `npm run validate` :

```bash
npm run validate
```

Cela enchaîne **lint statique → E2E (smoke + agenda + admin) → visual regression**.
Si tout est vert en local, la CI passera (sauf écart d'environnement OS-specific
sur les baselines visuels — voir section *Visual regression*).

Pour démarrer le serveur PHP local manuellement (test dans le navigateur) :

```bash
npm run dev
# → http://127.0.0.1:8000/fr/    (site public)
# → http://127.0.0.1:8000/admin/ (console admin)
```

Identifiants admin en local quand le serveur est lancé via Playwright (tests) :
`test-admin` / `asje-test-2026`. Pour `npm run dev`, lis les variables
d'environnement `ADMIN_USER` / `ADMIN_PASS` (cf. [DEPLOY.md](DEPLOY.md)).

## 1. Lint statique

### Lancer en local

```bash
# Tout le projet
./scripts/lint.sh

# Uniquement les fichiers staged (avant commit)
./scripts/lint.sh --staged

# Fichiers modifiés vs main (avant push de PR)
./scripts/lint.sh --diff
```

### Ce que ça vérifie

| Type | Fichier | Vérif |
|---|---|---|
| **PHP** | `*.php` | Syntaxe via `php -l` |
| **JSON** | `*.json` | Parse via `python json` |
| **JS** | `*.js` | Syntaxe via `node --check` |
| **HTML** | `*.html` | Tags structurels (`<html>`, `<head>`, `<body>`), équilibre des balises majeures, `lang=` sur `<html>`, `<title>` non vide, **liens internes vers fichiers existants** |
| **CSS** | `src/css/*.css` + `<style>` inline | **Variables `var(--xxx)` toutes définies**, classes HTML utilisées vs définies (warning) |

### Ce qui est bloquant vs warning

- **Erreur ✖** (code retour 1, bloque la PR) :
  - Variable CSS utilisée mais non définie
  - Lien interne cassé (page référencée qui n'existe pas)
  - Balise HTML non équilibrée
  - PHP syntaxe invalide
  - JSON malformé
- **Warning ⚠** (affichage seulement) :
  - `<meta description>` manquante
  - Classe HTML jamais définie en CSS (souvent classes JS)
  - Variable CSS définie mais jamais utilisée (code mort)

### Pre-commit hook (optionnel, fortement recommandé)

Pour éviter de pousser du code cassé sans s'en rendre compte :

```bash
# Une seule fois, sur la machine de dev
ln -sf ../../scripts/lint.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
# Le hook fera ./scripts/lint.sh --staged à chaque git commit
```

Pour bypasser exceptionnellement (déconseillé) : `git commit --no-verify`.

## CI GitHub Actions

À chaque push sur `main` ou ouverture/update de PR vers `main`, le workflow
[.github/workflows/lint.yml](.github/workflows/lint.yml) lance le lint sur
Ubuntu avec PHP 8.3, Python 3.12 et Node 20.

- **Sur PR** : lint uniquement les fichiers modifiés vs `main` (`--diff`),
  rapide.
- **Sur push main** : lint tout le projet (sécurité, ~5 secondes).

Le résultat est visible dans l'onglet **Checks** de la PR. Une PR avec lint
en échec ne peut pas être mergée si la branch protection l'exige (à
configurer côté GitHub : Settings → Branches → main).

## 2. Tests E2E Playwright

### Lancer en local

```bash
npm install                # première fois seulement
npx playwright install chromium webkit   # première fois seulement
npm run test:e2e           # lance tous les tests headless
npm run test:e2e:headed    # avec navigateur visible (debug)
npm run test:e2e:report    # ouvre le rapport HTML
```

Playwright démarre automatiquement le serveur PHP local
(via [playwright.config.js](playwright.config.js)) avant les tests.

### Suites de tests

| Fichier | Couverture |
|---|---|
| `tests/e2e/smoke.spec.js` | 17 pages publiques (FR + EUS) — répond 200, titre correct, header/footer visibles, lang correct, **0 erreur JS console** |
| `tests/e2e/agenda.spec.js` | Hero, chips équipes, sous-tabs Précédent/Ce week-end/Suivant, bilan saison, classement avec ligne ASJE surlignée, switch FR↔EUS, carousel news |
| `tests/e2e/admin.spec.js` | Console admin — login (bons / mauvais identifiants / logout), CRUD article, upload + suppression photo, lecture configuration équipes. Joué aussi en `mobile-small` (iPhone SE 375×667) pour valider l'usage au téléphone. |
| `tests/e2e/visual.spec.js` | Captures d'écran de toutes les pages publiques (FR + EUS) en desktop + mobile, comparées au baseline |

### Tests admin et isolation

Les tests `admin.spec.js` partagent l'état serveur (`data/articles.json`, `data/galerie.json`,
`admin/uploads/`). Pour éviter les conflits :

- Chaque test crée des artefacts avec un titre/légende **unique** basé sur `Date.now()`
  (ex: `Test E2E article 1714316455123`).
- Chaque test **supprime** ce qu'il a créé avant de finir.
- `playwright.config.js` désactive `fullyParallel` (les tests s'enchaînent en série).
- Les credentials admin sont injectés via env vars `ADMIN_USER` / `ADMIN_PASS` dans
  `webServer.env` de la config Playwright (compte `test-admin` / hash bcrypt fixe).

Le test `équipes` est volontairement **lecture seule** (un save toucherait au vrai
fichier `data/equipes.json` et déclencherait l'archivage de saison). Si on veut tester
le save équipes, il faudra ajouter un mécanisme de snapshot/restore via `globalSetup`.

### CI

[.github/workflows/e2e.yml](.github/workflows/e2e.yml) lance les tests
sur 2 navigateurs (Chromium desktop + WebKit mobile iPhone 13) à chaque
PR. Le rapport HTML est uploadé en artifact GitHub (téléchargeable depuis
la page de la PR) et conservé 14 jours.

## Hooks Git locaux

Vu que la branch protection GitHub n'est pas dispo sur les repos privés
gratuits, on installe deux hooks côté client.

```bash
./scripts/hooks/install.sh    # une seule fois après clone
```

- **`pre-commit`** : `scripts/lint.sh --staged` avant chaque commit
- **`pre-push`** : interdit le push direct sur `main`

Bypass : `--no-verify` (réservé aux urgences).

## 3. Analyse d'impact

Pour chaque modification, on déduit automatiquement les zones du site
potentiellement impactées et la checklist de validation correspondante.

### Lancer en local

```bash
python scripts/impact.py            # diff vs main
python scripts/impact.py --staged   # fichiers staged uniquement
```

### Comment ça marche

Le script lit la liste des fichiers modifiés (via `git diff`) et utilise
une matrice de propagation `IMPACT_RULES` qui mappe :
- `src/css/main.css` → toutes les pages publiques
- `src/js/fff-integration.js` → home + agenda
- `data/equipes.json` → agenda (chips, hero, classement)
- `admin/api.php` → console admin complète
- *(etc.)*

Pour chaque zone touchée, il propose :
- Les **suites E2E** Playwright à relancer en priorité
- Une **checklist de validation manuelle** (visuelle, mobile, switch FR↔EUS…)

### Niveau de risque

- 🟢 **Faible** : changement sur 1-2 zones, pas de page globale
- 🟠 **Moyen** : 3+ zones touchées
- 🔴 **Élevé** : changement sur toutes les pages, console admin, ou navigation

### CI

[.github/workflows/impact.yml](.github/workflows/impact.yml) lance le
script à chaque PR et **poste le rapport en commentaire de la PR**
(commentaire sticky, mis à jour à chaque push). Non bloquant — c'est
de l'information pour aider la review.

## 4. Visual regression

Capture les pages critiques en screenshot et compare au baseline pour
détecter les régressions visuelles non intentionnelles (ex : un changement
CSS qui décale un élément ailleurs sans qu'on s'en rende compte).

### Pages couvertes (FR + EUS)

- Home, Club, Équipes, Agenda, Galerie, Partenaires, Contact (FR)
- Home, Egutegia (EUS) — autres pages EUS structurellement identiques

Chaque page est capturée en **desktop (Chromium)** et **mobile (iPhone 13)**.

### Tolérance

- 0.2% de pixels différents max (couvre le rendu sub-pixel des fonts
  entre runners GitHub Actions)
- Animations CSS désactivées au runtime
- Bandeau cookies fermé (état accepté forcé)
- Délai 500 ms pour le chargement de Roboto Flex (anti-FOUT)

### Première utilisation : générer le baseline initial

Les baselines sont **OS-specific** (Linux ≠ Windows). On les génère
en CI Ubuntu pour matcher l'environnement d'exécution :

1. Aller sur GitHub → Actions → **Visual regression** → **Run workflow**
2. Cocher **« Régénérer les baselines (commit auto sur la branche) »**
3. Lancer
4. Le workflow génère les screenshots et les commit dans
   `tests/e2e/visual.spec.js-snapshots/` sur la branche

Une fois cette opération faite (~5 min), le mode comparaison s'active
automatiquement à chaque PR.

### Mise à jour après un changement visuel intentionnel

Quand on fait un changement de design assumé (refonte M3, nouvelle
couleur, nouvelle section…), les baselines doivent être actualisés.

**Méthode 1** : sur la branche de la PR, lancer le workflow
**Visual regression** avec **« Régénérer les baselines »** coché.
Les nouveaux screenshots sont commités automatiquement.

**Méthode 2** (local Windows, pour debug) :
```bash
npm run test:visual:update
```
⚠ Les baselines générés sur Windows ne matcheront pas en CI Linux.
Cette méthode est utile pour debug rapide, pas pour commit.

### Lecture du diff

En cas d'échec en CI, un artifact `visual-diff-report` est uploadé sur
la PR. Téléchargez-le, dézippez, ouvrez `playwright-report/index.html` :
chaque test échoué affiche **3 images côte à côte** : Expected (baseline),
Actual (capture courante), Diff (zones rouges = pixels modifiés).

### Triggers du workflow

- **Auto sur PR** quand un fichier touché correspond à `src/**`,
  `public/**`, `admin/**`, `data/**`, ou aux specs visuelles elles-mêmes.
  Pas déclenché si la PR ne touche que `scripts/`, `docs/`, ou `.github/`.
- **Manuel via `workflow_dispatch`** pour régénérer ou tester ponctuellement.
