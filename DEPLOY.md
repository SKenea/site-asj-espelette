# Déploiement — Site ASJ Espelette

Ce document décrit comment déployer le site sur un hébergeur PHP mutualisé
et comment configurer le rafraîchissement automatique du cache FFF.

## Stack et prérequis

- **PHP 8.1+** (testé sur 8.3) avec extensions `curl`, `openssl`, `mbstring`
- **Pas de base de données** : tout est en fichiers JSON (`data/*.json`)
- **Cron** côté hébergeur (toutes les solutions mutualisées en proposent)
- **HTTPS** : obligatoire pour les API FFF et la console admin

## Hébergeur recommandé

| Hébergeur | Prix/an | Pourquoi |
|---|---|---|
| **Alwaysdata** (gratuit 100 MB) | 0 € | Idéal pour démarrer, cron via interface, support FR |
| Alwaysdata 10 GB | ~40 € | Confort, mail inclus |
| OVH Perso | ~35 € | Classique, cron OK |
| o2switch | ~60 € | Illimité, support FR réactif |

## 1. Configuration initiale

### Variables d'environnement à définir sur l'hébergeur

| Variable | Rôle | Exemple |
|---|---|---|
| `FFF_REFRESH_KEY` | Secret partagé pour autoriser les appels au cron | `7gK2pX9mZv8wQrLn` |
| `FFF_TOKEN_PATH` | Chemin du token de sécurité FFF (généralement constant) | `***REMOVED***` |
| `ADMIN_USER` | Identifiant admin de la console | `admin` |
| `ADMIN_PASS` | Hash bcrypt du mot de passe admin (voir plus bas) | `$2y$10$abc…` |

Sur Alwaysdata : *Environnement* → *Variables d'environnement* (s'applique à
tous les sites du compte).

Alternative pour les hébergeurs sans variables d'env : créer un fichier
`admin/.fff-refresh-key` contenant uniquement la clé sur une ligne, mode
600 (lisible uniquement par le serveur web). Le script
`admin/fff-refresh.php` fallback dessus si `FFF_REFRESH_KEY` n'est pas défini.

```bash
# Sur le serveur, après upload :
echo "votre_clé_secrète_aléatoire" > /chemin/admin/.fff-refresh-key
chmod 600 /chemin/admin/.fff-refresh-key
```

### Mot de passe admin

Le hash bcrypt du mot de passe admin se passe **via la variable
d'environnement `ADMIN_PASS`** (ne plus committer le hash dans le code) :

1. Générer le hash en local :
   ```bash
   php -r 'echo password_hash("votre_mot_de_passe", PASSWORD_DEFAULT) . "\n";'
   ```
2. Coller la valeur produite (commençant par `$2y$10$…`) dans la
   variable d'environnement `ADMIN_PASS` côté hébergeur.
3. Idem pour `ADMIN_USER` si tu veux changer le login (défaut : `admin`).

Le code lit ces valeurs avec un fallback **invalide volontaire** dans
[admin/api.php](admin/api.php) — donc si la variable d'env n'est pas
configurée, **personne ne peut se logger**, ce qui est plus sûr qu'un
fallback en dur.

### Permissions filesystem

Le proxy et l'API écrivent dans :
- `data/cache/` (cache FFF, créé automatiquement)
- `data/articles.json`, `data/galerie.json`, `data/equipes.json`
- `admin/uploads/` (upload de photos)

Ces dossiers/fichiers doivent être inscriptibles par le serveur web (PHP).
Sur Alwaysdata/OVH, c'est généralement déjà le cas après upload SFTP.

## 2. Procédure de déploiement initial

### Manuel (FTP/SFTP)

1. Sur l'hébergeur, créer un site pointant vers le dossier `public/` comme
   docroot (la racine web ne doit PAS être la racine du repo, sinon
   `data/`, `admin/`, etc. seraient exposés).

   **Mais ATTENTION** : `public/` référence en absolu `/src/`, `/admin/`,
   `/data/` (URLs comme `/src/css/main.css`). Il faut donc soit :
   - Configurer la racine web sur la racine du projet (et bloquer l'accès
     à `tools/`, `docs/`, `.git/`, `.env*` via `.htaccess`)
   - Ou créer des symlinks `public/src → ../src`, `public/data → ../data`,
     `public/admin → ../admin`

   Le plus simple sur mutualisé : **racine web = racine projet** + un
   `.htaccess` à la racine pour rewriter `/` vers `/public/index.html` et
   bloquer les chemins sensibles.

2. Upload via SFTP (filezilla, WinSCP, ou rsync).
   Fichiers à exclure : `tools/php/`, `tools/*.zip`, `data/cache/`,
   `.playwright-mcp/`, `*.png` à la racine, `node_modules/`, `.git/`,
   `dev-server.py`, `router.php` (utilitaire dev local uniquement).

3. Créer `data/cache/` (vide) avec les permissions d'écriture.

4. Coller le hash bcrypt admin dans [admin/api.php](admin/api.php#L10).

5. Créer le fichier `admin/.fff-refresh-key` (voir plus haut).

6. Vérifier l'accès :
   - https://ton-domaine.fr/fr/ → page d'accueil
   - https://ton-domaine.fr/admin/index.html → écran login admin

### Automatisé (GitHub Actions, cible future)

Workflow `.github/workflows/deploy.yml` à créer plus tard pour déployer
automatiquement à chaque push sur `main`. Voir issue ouverte.

## 3. Cron de rafraîchissement FFF

Le script [admin/fff-refresh.php](admin/fff-refresh.php) pré-charge le
cache FFF en arrière-plan, pour que les visiteurs n'aient jamais à
attendre un appel à la FFF dans leur parcours.

### Cadence recommandée : 2× par jour

- **07 h 00** : récupère les résultats du week-end (publiés en général
  lundi matin) + les programmations à venir
- **19 h 00** : récupère les éventuelles mises à jour de la journée
  (FFF publie parfois en soirée les compositions de match)

### Configuration sur Alwaysdata

1. *Environnement* → *Tâches programmées*
2. Ajouter deux tâches identiques avec ces paramètres :

   | Champ | Valeur |
   |---|---|
   | Commande | `curl -fsS "https://ton-domaine.fr/admin/fff-refresh.php?key=VOTRE_CLE"` |
   | Programmation | `0 7 * * *` puis `0 19 * * *` |
   | Logger la sortie | Oui (utile pour suivi en cas de souci) |

### Configuration via crontab Linux (autres hébergeurs)

```cron
# Rafraîchissement FFF — 2× par jour
0 7  * * * curl -fsS "https://asj-espelette.fr/admin/fff-refresh.php?key=XXXXXX" >> /var/log/asje-fff-cron.log 2>&1
0 19 * * * curl -fsS "https://asj-espelette.fr/admin/fff-refresh.php?key=XXXXXX" >> /var/log/asje-fff-cron.log 2>&1
```

### Vérification

Après la première exécution du cron, vérifier le log. Sortie attendue :

```
[2026-04-26 07:00:02] FFF refresh : 10 ok, 0 kept, 0 fail, 16.4s total
  [OK]   calendrier         {"mois_avant":0,"mois_apres":3} 1788ms
  [OK]   prochains-matchs   {"limit":5}                    416ms
  [OK]   resultats          {"equipe":"senior1"}           1949ms
  ...
```

- `ok` = nouvelle donnée FFF récupérée et cachée
- `kept` = FFF a échoué mais l'ancien cache est préservé (le site continue de fonctionner)
- `fail` = FFF a échoué et il n'y avait pas de cache précédent (rare)

### Si la FFF est down

Pas de panique : le proxy continue de servir les anciennes données du
cache, le visiteur ne voit pas de différence. Au prochain cron qui
réussira, les données reprennent leur cours.

## 4. TTL du cache

Configuré à **18 h** dans [admin/fff-proxy.php](admin/fff-proxy.php#L13)
(constante `CACHE_TTL`). C'est un filet de sécurité : si le cron est
indisponible plusieurs cycles, le proxy fait un refetch on-demand au
premier visiteur. Ce TTL est dimensionné pour qu'un cron 2×/jour suffise
largement.

Si le cron est désactivé, on peut redescendre à 6 h pour assurer une
fraîcheur similaire au mode purement on-demand.

## 5. Procédure de rentrée de saison (août/septembre)

Chaque saison, la FFF :
- Renouvelle les IDs des équipes (`2025_8748_SEM_1` → `2026_8748_SEM_1`)
- Peut changer le numéro d'équipe interne (par ex. l'effectif U13 a 3 équipes
  cette année, 2 l'an prochain)
- Met à jour les compétitions et groupes

### Procédure standard (5-15 min)

1. Se connecter à `/admin/`
2. Onglet **Équipes**
3. Cliquer **Préparer la saison suivante** (en bas de l'onglet)
   - Ça incrémente le champ saison et préfixe les IDs avec le nouveau millésime
   - L'ancienne configuration est archivée dans `data/equipes-archive/2025-2026.json`
4. **Vérifier chaque ID FFF sur le site FFF** :
   - Aller sur https://epreuves.fff.fr → recherche club « ASJ ESPELETTE »
   - Cliquer sur chaque équipe et noter l'ID complet visible dans l'URL
   - Format `YYYY_8748_CATEGORIE_NUMERO`
   - Le numéro d'équipe peut différer si l'effectif a changé !
5. Ajouter / supprimer des équipes au besoin (boutons « + Ajouter une équipe »
   et « Supprimer »)
6. Cliquer **Enregistrer la configuration**
7. Le cache FFF est automatiquement vidé. Le prochain cron (ou visiteur)
   re-télécharge tout.

### Ce qui se met à jour automatiquement avec la saison

- Bornes de la saison dans le proxy ([admin/fff-proxy.php](admin/fff-proxy.php))
  qui filtre les matchs par date — **calculé depuis le champ saison**, pas en dur
- Année copyright dans le footer (JavaScript lit `Date.now()`)
- Chips équipes sur la page agenda (générés depuis `data/equipes.json`)
- Hero match card et classement par équipe

### Ce qu'il faut éventuellement adapter à la main

- Si le club ouvre une nouvelle catégorie (ex: U15) ou en supprime une,
  ajuster la liste des équipes via l'admin
- Si le terrain de domicile change, modifier les pages contact / mentions légales
- Articles annuels (« Bilan saison 2025-2026 », appel à licenciés…) à publier
  via l'onglet Actualités

### Archives

`data/equipes-archive/` conserve les configs des saisons précédentes
(format `2025-2026.json`). Utilisable pour :
- générer plus tard une page « Palmarès » avec les classements de fin de saison
- retracer un licencié à un effectif d'équipe historique
- backup en cas d'erreur lors de la rentrée

Aucune action n'est nécessaire pour gérer les archives — l'API les crée
automatiquement au moment du « Préparer la saison suivante ».

## 6. Checklist pré-mise-en-ligne

- [ ] Hébergeur PHP 8+ configuré, HTTPS actif (Let's Encrypt automatique
      sur Alwaysdata)
- [ ] Hash bcrypt admin défini dans `admin/api.php`
- [ ] Fichier `admin/.fff-refresh-key` créé avec une clé aléatoire
      (≥ 24 caractères)
- [ ] Dossier `data/cache/` créé et inscriptible
- [ ] Dossier `admin/uploads/` inscriptible (pour upload de photos
      galerie)
- [ ] Cron 7h + 19h configuré
- [ ] Test : visiter `/fr/` et `/fr/agenda.html` en navigation privée,
      vérifier que les données FFF s'affichent
- [ ] Test admin : `/admin/`, connexion, ajout d'un article test, suppression
- [ ] Tester FR ↔ EUS sur 2-3 pages
- [ ] Soumettre `https://ton-domaine.fr/sitemap.xml` à Google Search
      Console (sitemap à générer plus tard)
