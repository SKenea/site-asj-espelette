# Tests, lint et qualité — Site ASJ Espelette

Ce document décrit la pipeline de validation mise en place pour minimiser
les régressions et évaluer l'impact de chaque changement.

## Vue d'ensemble

| Pilier | Outil | Quand | Bloquant ? |
|---|---|---|---|
| **1. Lint statique** | `scripts/lint.sh` | Local + CI sur chaque PR | Oui |
| **2. Tests E2E** | Playwright headless *(à venir)* | CI sur PR | Oui |
| **3. Analyse d'impact** | `scripts/impact.py` *(à venir)* | CI : commentaire PR | Non |
| **4. Visual regression** | `scripts/visual-diff.js` *(à venir)* | CI sur PR | Avertissement |

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

## Évolutions à venir

- Tests E2E Playwright sur les parcours critiques (home, agenda, admin)
- Script `impact.py` qui lit `git diff` et liste les pages/composants
  potentiellement touchés
- Visual regression : screenshots baseline + diff pixel-par-pixel
