# Contribution — Site ASJ Espelette

Ce document décrit la convention de travail Git appliquée à ce projet.
Modèle utilisé : **GitHub Flow** (simple, adapté à un développeur principal).

## Principe

- `main` est la **seule branche permanente**. Elle représente toujours
  l'état de production. À terme, chaque commit sur `main` déclenchera un
  déploiement automatique vers l'hébergeur.
- Tout travail se fait sur des **branches éphémères** créées depuis `main`
  et fusionnées dans `main` via Pull Request une fois terminé.
- Une fois la PR mergée, la branche est supprimée.

## Nommage des branches

Préfixe en minuscules, slash, description courte en kebab-case.

| Préfixe | Usage | Exemple |
|---|---|---|
| `feature/` | Nouvelle fonctionnalité | `feature/carousel-news` |
| `fix/` | Correction de bug non urgent | `fix/bandeau-cookies-mobile` |
| `hotfix/` | Correction urgente sur production | `hotfix/proxy-fff-down` |
| `chore/` | Maintenance, outillage, dépendances | `chore/update-php-portable` |
| `docs/` | Documentation seulement | `docs/deploy-procedure` |
| `refactor/` | Restructuration sans changement fonctionnel | `refactor/fff-integration-modules` |

Règles :
- pas d'accent ni d'espace
- 3 à 6 mots maximum dans la description
- garder le préfixe sémantique (aide à scanner le repo et auto-générer les changelogs)

## Workflow type

```bash
# 1. Partir de main à jour
git switch main
git pull

# 2. Créer une branche
git switch -c feature/galerie-lightbox

# 3. Travailler, committer
git add ...
git commit -m "Ajoute lightbox au clic sur les photos galerie"

# 4. Pousser et ouvrir une PR
git push -u origin feature/galerie-lightbox
# Ouvrir une PR vers main sur GitHub

# 5. Après merge, nettoyer
git switch main
git pull
git branch -d feature/galerie-lightbox
```

## Convention de messages de commit

Première ligne : impératif présent, en français, < 72 caractères.

Bons exemples :
- `Ajoute le compte à rebours du prochain match sur la home`
- `Corrige le débordement du bandeau cookies sur mobile`
- `Refactor du proxy FFF pour lire data/equipes.json`

À éviter :
- `update files` (vague)
- `fix bug` (lequel ?)
- Mélanger plusieurs sujets dans un commit

Si le commit nécessite plus d'explications, sauter une ligne et écrire un
paragraphe expliquant le **pourquoi** (le quoi est dans le diff).

## Ce qui n'est PAS commité

Le `.gitignore` filtre automatiquement :
- `tools/php/` — PHP portable de dev local (~84 Mo)
- `tools/*.zip` — archives de téléchargement
- `data/cache/` — cache du proxy FFF, régénéré à la demande
- `.playwright-mcp/` — logs de tests Playwright
- `/*.png` — captures d'écran de debug à la racine
- `dev-server.py`, `.dev-server.log` — anciens utilitaires
- `node_modules/`, `dist/`, `build/`, `.env`, `.vscode/`, fichiers OS

## Évolution future possible

Si le projet grandit (équipe, environnement de staging), on pourra ajouter :
- une branche permanente `dev` pour bundler plusieurs features avant prod
- un sous-domaine `dev.asj-espelette.fr` déployé depuis cette branche
- une étape PR `dev → main` lors des mises en production groupées

Tant qu'on reste à un développeur et un seul environnement (prod),
GitHub Flow simple suffit.
