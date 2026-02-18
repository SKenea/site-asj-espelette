# CAHIER DES CHARGES
## Site Internet Officiel — ASJ Espelette

**Version :** 2.0 — Février 2026
**Émetteur :** ASJ Espelette
**Rédigé avec l'accompagnement de :** SKenea
**Destinataire :** Prestataire(s) consulté(s)
**Statut :** Document de travail

---

> Ce document formalise les besoins de l'ASJ Espelette en matière de site internet.
> Les points restant à arbitrer par la direction sont signalés par le picto **[À PRÉCISER]**.

---

## 1. CONTEXTE ET OBJECTIFS

L'ASJ Espelette est un club de football basé à Espelette (Pays Basque). À ce jour, le club ne dispose pas de site internet officiel. Un site Footeo existe (asjespelette.footeo.com), mais il concerne uniquement les U11 et n'a pas été mis en place par la direction.

Nous souhaitons nous doter d'un site internet qui permette de :

- Donner une **vitrine officielle** au club (pour les familles, les licenciés, les curieux)
- Centraliser les **résultats et le calendrier** des matchs
- Publier des **actualités** et des **photos** facilement
- Afficher nos **partenaires** et attirer de nouveaux sponsors
- Proposer le site en **français et en euskara** pour refléter l'identité basque du club

**Ce que le site n'a pas besoin de faire (sauf décision contraire de la direction) :**

- Gérer les inscriptions (c'est le rôle de Sport Easy)
- Vendre des maillots ou de la billetterie
- Remplacer les réseaux sociaux (Instagram, Facebook)

---

## 2. PÉRIMÈTRE FONCTIONNEL

### Pages souhaitées

| Page | Contenu | Source des données |
|------|---------|-------------------|
| **Accueil** | Dernières actus, prochains matchs, liens réseaux sociaux | Actus = saisie par notre bénévole / Matchs = automatique via FFF |
| **Le Club** | Histoire du club, bureau (président, trésorier...), photos des éducateurs | Fourni par le club |
| **Équipes** | Liste des équipes (Seniors, U13 x3, U11, U9, U8, U7) avec liens FFF et Sport Easy | Liens existants |
| **Calendrier & Résultats** | Calendrier et scores de toutes les équipes | **Automatique** — données issues du site FFF |
| **Galerie photos** | Albums par événement (matchs, tournois, fêtes) | Bénévole (upload simple) |
| **Partenaires** | Logos des sponsors classés par niveau (Or / Argent / Bronze) + offre de partenariat en PDF | Fourni par le club |
| **Contact** | Formulaire, adresse du stade, horaires, plan d'accès | **[À PRÉCISER]** |
| **Mentions légales** | Obligations RGPD, cookies, éditeur | À rédiger par le prestataire |

### Fonctionnalités attendues

- **Interface d'administration** : nous souhaitons qu'un bénévole non-technique puisse publier des actualités, ajouter des photos et gérer les partenaires sans toucher au code
- **Intégration FFF** : le calendrier des matchs et les résultats de toutes les équipes du club doivent s'afficher automatiquement, sans intervention humaine
- **Bilinguisme français / euskara** : tout le site doit être disponible dans les deux langues, avec un bouton de bascule visible en permanence
- **Responsive** : le site doit s'afficher correctement sur mobile, tablette et ordinateur
- **Formulaire de contact** : les visiteurs doivent pouvoir envoyer un message au club
- **Liens réseaux sociaux** : les comptes Instagram et Facebook du club doivent être intégrés

---

## 3. EXIGENCES ET CONTRAINTES

### Bilinguisme français / euskara

Tout le site devra être disponible en français et en euskara.
Un bouton **FR / EUS** devra être visible en permanence en haut de chaque page.
La langue par défaut sera le français.

Les menus en basque : *Hasiera, Kluba, Taldeak, Egutegia, Argazkiak, Bazkideak, Harremanetan jarri...*

> **[À PRÉCISER]** La traduction en euskara sera-t-elle assurée par un bénévole du club ou faut-il prévoir un traducteur externe ?

### Données FFF (calendrier et résultats)

Nous souhaitons que les données suivantes soient récupérées **automatiquement** depuis le site de la Fédération Française de Football, sans aucune intervention de notre part :

- **Calendrier des matchs** : dates, horaires, lieux, équipes adverses
- **Résultats et scores** : mis à jour après chaque journée
- **Informations du club** : catégories, terrains

> **À noter :** La FFF ne propose pas d'API publique documentée pour les clubs amateurs. Il est néanmoins possible de récupérer les données via les interfaces internes du site fff.fr (mécanisme testé avec succès). Le prestataire devra mettre en place cette intégration et prévoir un suivi dans le cadre de la maintenance, car ces interfaces pourraient évoluer. Un mécanisme de secours et un lien direct vers la page du club sur fff.fr devront être prévus en dernier recours.

### Identité visuelle

- Couleur officielle du club : **bleu** (référence FFF)
- Palette déduite du logo : bleu #0070A0
- Nous fournirons notre logo en haute qualité (cf. section 4)

> **[À PRÉCISER]** La palette de couleurs reste à valider par la direction.

### Nom de domaine

| Élément | Choix envisagé |
|---------|---------------|
| **Nom de domaine** | **asjespelette.eus** — le .eus est l'extension du Pays Basque |
| **Langue par défaut** | Français, avec bascule vers euskara |

> La disponibilité du nom de domaine asjespelette.eus reste à vérifier.

---

## 4. CONTENUS FOURNIS PAR LE CLUB

Nous nous engageons à fournir les éléments suivants au prestataire retenu.

| # | Élément | Précision | Priorité |
|---|---------|-----------|----------|
| 1 | **Logo du club en haute qualité** | Format numérique (PNG fond transparent ou SVG). La version disponible sur le site FFF est insuffisante. | Haute |
| 2 | **Texte de présentation / histoire du club** | Quelques paragraphes en français, en basque, ou les deux. Le prestataire pourra nous accompagner sur la rédaction si besoin. | Moyenne |
| 3 | **Photos des éducateurs** | Une photo par coach, avec son nom et la catégorie encadrée. Format portrait de préférence. | Moyenne |
| 4 | **Nom du président et composition du bureau** | Pour la page « Le Club » et les mentions légales. | Haute |
| 5 | **Horaires d'entraînement** | Par catégorie, pour la page Contact. | Moyenne |
| 6 | **Numéro de téléphone du club** | Pour la page Contact et les mentions légales. | Moyenne |
| 7 | **Liste des partenaires actuels** | Pour chacun : nom, logo en bonne qualité, site web, et niveau souhaité (Or / Argent / Bronze). | Avant mise en ligne |
| 8 | **Contenu de l'offre de partenariat** | Texte décrivant les avantages par niveau. Le prestataire le mettra en forme en PDF téléchargeable. | Avant mise en ligne |
| 9 | **Adresses des comptes Instagram et Facebook officiels** | Les URLs exactes pour les intégrer au site. | Haute |

---

## 5. DÉCISIONS À PRENDRE PAR LA DIRECTION

Certains points restent à arbitrer en interne avant de lancer la réalisation.

| # | Question | Options envisagées |
|---|----------|-------------------|
| A | **Sport Easy** : quel niveau d'intégration ? | **Option 1 :** Un simple lien vers Sport Easy (suffisant pour commencer) / **Option 2 :** Afficher les infos Sport Easy directement sur le site (plus complexe) |
| B | **Boutique / billetterie** : à prévoir ? | **Option 1 :** Pas pour le moment, à ajouter plus tard si besoin / **Option 2 :** Oui, dès le lancement |
| C | **Qui traduira en euskara ?** | Un bénévole du club saisit les traductions via l'interface d'administration / Ou prévoir un traducteur externe |
| D | **Qui administrera le site au quotidien ?** | Nom du bénévole référent à désigner — il sera formé par le prestataire |

---

## 6. GESTION QUOTIDIENNE DU SITE

Nous souhaitons que le site soit simple à administrer au quotidien. Il ne doit pas devenir une charge pour nos bénévoles.

### Ce qui doit être automatique (aucune intervention de notre part)
- **Calendrier et résultats** : récupérés automatiquement depuis le site de la FFF
- **Plan d'accès** : carte interactive générée automatiquement

### Ce que notre bénévole fera (via une interface simple, sans compétences techniques)
- **Publier une actualité** : remplir un formulaire (titre, texte, photo) — l'article apparaît sur le site
- **Ajouter des photos** : glisser-déposer des images dans la galerie
- **Mettre à jour les partenaires** : opération ponctuelle (1 à 2 fois par an)

### Ce que notre bénévole ne doit PAS avoir à faire
- Toucher au code du site
- Gérer l'hébergement ou la technique
- Mettre à jour des logiciels

> Une **formation** est attendue pour le bénévole administrateur, ainsi qu'un **guide d'utilisation** simple.

---

## 7. PRESTATIONS ATTENDUES DU PRESTATAIRE

Le prestataire retenu devra fournir :

- **Conception et maquettes graphiques** aux couleurs du club, validées par la direction avant développement
- **Développement et intégration** du site complet (toutes les pages listées en section 2)
- **Configuration du bilinguisme** français / euskara
- **Intégration automatique** du calendrier et des résultats depuis le site de la FFF
- **Interface d'administration** permettant à un bénévole de gérer les actualités, les photos et les partenaires
- **Formation** du bénévole administrateur
- **Guide d'utilisation** simple et illustré
- **Mise en ligne** du site sur le nom de domaine retenu
- **Maintenance** : une offre de maintenance annuelle devra être proposée, couvrant au minimum la surveillance du site, les sauvegardes, le suivi de l'intégration FFF, et le support au bénévole

---

## 8. SOLUTIONS TECHNIQUES ENVISAGÉES

Trois grandes familles de solutions nous ont été présentées pour réaliser un site de ce type. Le choix définitif sera fait par la direction en fonction des priorités du club.

### Option A — Site codé sur-mesure (HTML/CSS/JS + PHP)

> *Un site créé de zéro, taillé pour le club, avec une petite interface d'administration.*

**Avantages :**
- Site très rapide (pas de logiciel lourd)
- Aucune mise à jour de sécurité à gérer
- Coûts de fonctionnement les plus bas
- Design 100 % aux couleurs du club
- Le site appartient totalement au club

**Inconvénients :**
- Interface d'administration plus basique
- Toute nouvelle fonctionnalité nécessite le prestataire
- Moins de flexibilité pour le bénévole sur la mise en page

### Option B — WordPress

> *Le système de gestion de contenu le plus utilisé au monde (~43 % des sites web).*

**Avantages :**
- Interface d'administration riche et intuitive (éditeur visuel)
- Le bénévole peut modifier la mise en page, ajouter des pages
- Bilinguisme géré par un plugin (Polylang)
- Très grande communauté : facile de trouver de l'aide
- Évolutif : boutique, newsletter, formulaires... via des plugins

**Inconvénients :**
- Mises à jour régulières nécessaires (sécurité)
- Sans maintenance, le site peut devenir vulnérable
- Un peu plus lent qu'un site sur-mesure
- Coûts de fonctionnement un peu plus élevés (plugins, hébergement)

### Option C — Wix

> *Un constructeur de sites en ligne, tout compris (hébergement inclus).*

**Avantages :**
- Très facile à prendre en main (glisser-déposer)
- Hébergement et sécurité gérés par Wix
- Pas besoin de prestataire pour les modifications simples

**Inconvénients :**
- Abonnement mensuel obligatoire (~15-30 euros/mois)
- Bilinguisme limité
- Moins de contrôle sur le design et le code
- Dépendance totale à la plateforme Wix (pas de portabilité)
- Intégration FFF plus contrainte techniquement

> **[À PRÉCISER]** Le choix de la solution technique sera validé par la direction lors de la réunion de cadrage.

---

## 9. ESTIMATION BUDGÉTAIRE

### Enveloppe de création : 3 000 euros HT

L'enveloppe budgétaire envisagée pour la création du site est de **3 000 euros HT**, couvrant :

- Conception et maquettes graphiques
- Développement et intégration du site complet
- Configuration du bilinguisme français / euskara
- Intégration automatique des données FFF (calendrier et résultats)
- Interface d'administration
- Formation du bénévole + guide d'utilisation
- Mise en ligne

### Hébergement et nom de domaine (coûts récurrents à notre charge)

| Poste | Estimation annuelle |
|-------|-------------------|
| **Nom de domaine** (asjespelette.eus) | ~10-15 euros/an |
| **Hébergement** | ~40-150 euros/an selon la solution retenue |
| **Total hébergement + domaine** | **~50-165 euros/an** |

### Maintenance annuelle

Nous souhaitons qu'un contrat de maintenance annuel soit proposé pour assurer la pérennité du site. Il devra couvrir au minimum :

- Surveillance du bon fonctionnement du site
- Sauvegardes régulières
- Suivi de l'intégration FFF (ajustements si la Fédération modifie son site)
- Support au bénévole administrateur (questions, accompagnement)
- Corrections de bugs éventuels
- Mises à jour de sécurité si nécessaire

| Poste | Estimation annuelle |
|-------|-------------------|
| **Maintenance** | **~250 euros HT/an** |

### Synthèse sur 5 ans

| Poste | Estimation |
|-------|-----------|
| Création du site | ~3 000 euros HT |
| Hébergement + domaine (5 ans) | ~250-825 euros |
| Maintenance (5 ans) | ~1 250 euros |
| **Total sur 5 ans** | **~4 500-5 075 euros HT** |

> Ces montants sont des estimations indicatives. Le détail sera précisé dans la proposition du prestataire retenu.

---

## 10. CALENDRIER PRÉVISIONNEL

> Les délais ci-dessous s'entendent **après réception des contenus** que nous fournirons (logo, textes, photos).
> La phase de recueil de nos contenus pourrait prendre 2 à 4 semaines.

| Étape | Durée estimée | Qui fait quoi |
|-------|---------------|---------------|
| Recueil des contenus | 2-4 sem. | Le club fournit les éléments (cf. section 4) |
| Maquettes graphiques | 1 sem. | Prestataire propose, le club valide |
| Développement et intégration | 2-4 sem. | Prestataire |
| Configuration bilinguisme | 1 sem. | Prestataire + bénévole traducteur |
| Tests et corrections | 1 sem. | Le club teste, prestataire corrige |
| Formation du bénévole | 1h | Prestataire forme |
| **Total après contenus reçus** | **5-8 semaines** | |

> **Objectif de mise en ligne : septembre 2026** (rentrée sportive)

---

## 11. PROCHAINES ÉTAPES

1. **La direction relit ce document** et arbitre les points **[À PRÉCISER]**
2. **Réunion de cadrage** (30 min) pour répondre aux questions et valider les besoins
3. **Validation du budget et de l'approche technique**
4. **Le club rassemble les contenus** (logo, textes, photos — cf. section 4)
5. **Démarrage de la réalisation** dès que les contenus principaux sont transmis au prestataire

---

*Document émis par l'ASJ Espelette — rédigé avec l'accompagnement de SKenea.*
