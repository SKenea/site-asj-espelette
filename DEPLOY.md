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

Dans [admin/api.php](admin/api.php), remplacer le placeholder
`$2y$10$CHANGE_ME_HASH` par un vrai hash bcrypt. Génération :

```bash
php -r 'echo password_hash("votre_mot_de_passe", PASSWORD_DEFAULT) . "\n";'
```

Coller le hash résultat dans la constante `ADMIN_PASS`. **Ne jamais
committer le hash en clair sur GitHub** (le repo est privé pour cette
raison). Une amélioration future est de lire `ADMIN_PASS` depuis une
variable d'environnement.

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

## 5. Mise à jour annuelle des équipes (rentrée saison)

Chaque saison, les IDs FFF des équipes changent (par ex.
`2025_8748_SEM_1` → `2026_8748_SEM_1`).

Procédure pour le bénévole :
1. Se connecter à `/admin/`
2. Onglet **Équipes**
3. Mettre à jour les IDs FFF, libellés FR/EU si besoin
4. Cliquer **Enregistrer**
5. Le cache FFF est automatiquement invalidé. Au prochain cron (ou au
   prochain visiteur si TTL dépassé), les nouvelles données seront
   récupérées.

Aucun PHP/SFTP nécessaire pour cette opération courante.

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
