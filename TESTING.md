# Tests, lint et qualité — Site ASJ Espelette

Ce document décrit la pipeline de validation mise en place pour minimiser
les régressions et évaluer l'impact de chaque changement.

## Vue d'ensemble

| Pilier | Outil | Quand | Bloquant ? |
|---|---|---|---|
| **1. Lint statique** | `scripts/lint.sh` | Local + CI sur chaque PR | Oui |
| **2. Tests E2E** | Playwright (`tests/e2e/`) | Local + CI sur chaque PR | Oui |
| **3. Analyse d'impact** | `scripts/impact.py` *(à venir)* | CI : commentaire PR | Non |
| **4. Visual regression** | `scripts/visual-diff.js` *(à venir)* | CI sur PR | Avertissement |
| **+ Hooks Git locaux** | `scripts/hooks/` | Pre-commit + pre-push | Oui (bypass `--no-verify`) |

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

## Évolutions à venir

- Script `scripts/impact.py` qui lit `git diff` et liste les
  pages/composants potentiellement touchés (commentaire automatique sur
  les PRs)
- Visual regression : screenshots baseline + diff pixel-par-pixel via
  Playwright `toHaveScreenshot`
