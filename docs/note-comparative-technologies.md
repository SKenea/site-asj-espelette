# NOTE COMPARATIVE — CHOIX DE LA TECHNOLOGIE

## Site Internet Officiel — ASJ Espelette

**Version :** 1.0 — Avril 2026
**Émetteur :** SKenea
**Destinataire :** Direction de l'ASJ Espelette
**Objet :** Aide à la décision sur la solution technique avant lancement de la réalisation

---

## 1. POURQUOI CETTE NOTE ?

Lors de la dernière échange, la direction du club nous a indiqué vouloir s'inspirer du site du club voisin **kanboko-izarra.fr**. Nous avons analysé sa technologie :

> Le site de Kanboko Izarra repose sur **WordPress** avec le thème payant **Woodmart**, le page builder **WPBakery**, plus une série de plugins (Formidable, Yoast, Swiper, widgets Score'n'co).

Ce choix est tout à fait valable, mais il induit des **coûts et contraintes spécifiques** qu'il est important d'arbitrer en connaissance de cause. Trois voies s'ouvrent à l'ASJE — cette note les compare.

> **À retenir d'emblée :** ce que le club apprécie visuellement chez Kanboko Izarra (hero en carrousel, actualités catégorisées, fil Instagram, widgets calendrier/classement) est **reproductible dans les trois scénarios**. Le choix porte sur la manière d'administrer le site et sur les coûts à 5 ans, pas sur le rendu final.

---

## 2. LES TROIS SCÉNARIOS

### Scénario A — Sur-mesure (HTML/CSS/JS + PHP)

> *Un site développé de zéro, taillé pour l'ASJE, avec une interface d'administration simple pour le bénévole.*

**Ce que ça veut dire concrètement** :
- Les pages sont des fichiers HTML légers, le CSS est écrit aux couleurs du club
- L'interface d'admin est un petit outil dédié (déjà amorcé dans le dépôt) pour gérer actus, photos et partenaires
- L'intégration FFF est codée une fois pour toutes

**Avantages** :
- Aucune licence à payer, aucun abonnement
- Site très rapide (chargement < 1 seconde)
- Pas de mises à jour de sécurité mensuelles à gérer
- 100 % propriété du club
- Interface d'admin **volontairement simple** : le bénévole ne peut pas casser le site par erreur

**Inconvénients** :
- Pour ajouter une nouvelle rubrique ou modifier la mise en page, il faut repasser par le prestataire
- Le bénévole ne peut pas modifier la structure des pages lui-même

### Scénario B — WordPress + thème premium (à l'identique de Kanboko Izarra)

> *La même recette que le club voisin : WordPress + Woodmart + WPBakery.*

**Avantages** :
- Interface visuelle riche : le bénévole peut créer des pages, déplacer des blocs
- Grande communauté, beaucoup de tutoriels en ligne
- Évolutif : on peut ajouter une boutique, une newsletter, etc. via des plugins

**Inconvénients** :
- Licence thème Woodmart : ~60 € tous les 6 mois
- Mises à jour à faire **au minimum une fois par mois** (WordPress + ~10 plugins)
- Sans maintenance active, le site peut être piraté en quelques semaines
- Hébergement plus exigeant (WordPress = PHP + base de données)
- Site plus lent (~3-5 secondes au chargement)
- Interface d'admin **riche mais complexe** : risque que le bénévole casse la mise en page

### Scénario C — WordPress + thème gratuit + Gutenberg

> *Le compromis : WordPress sans licence payante, avec l'éditeur natif (Gutenberg) et non WPBakery.*

**Avantages** :
- Admin WordPress moderne, familière à beaucoup
- Pas de licence thème à renouveler
- Plugins essentiels seulement (Polylang pour bilinguisme, un anti-spam)

**Inconvénients** :
- Mises à jour de sécurité régulières à faire (comme B)
- Intégration FFF à développer en plugin sur-mesure
- Design moins poussé qu'avec Woodmart sans développement complémentaire

---

## 3. TABLEAU COMPARATIF SUR 5 ANS

| Poste | Scénario A — Sur-mesure | Scénario B — WP + Woodmart | Scénario C — WP + Gratuit |
|---|---|---|---|
| **Création (prestataire)** | 3 000 € HT | 3 500 € HT ¹ | 3 200 € HT |
| **Licence thème (5 ans)** | 0 € | ~600 € ² | 0 € |
| **Hébergement (5 ans)** | 50-75 €/an × 5 = ~300 € | 100-150 €/an × 5 = ~625 € | 80-120 €/an × 5 = ~500 € |
| **Nom de domaine (5 ans)** | ~60 € | ~60 € | ~60 € |
| **Maintenance (5 ans)** | 250 €/an × 5 = **1 250 €** | 500 €/an × 5 = **2 500 €** ³ | 400 €/an × 5 = **2 000 €** |
| **TOTAL SUR 5 ANS** | **~4 610 €** | **~7 285 €** | **~5 760 €** |

¹ *Licence Woodmart incluse dans la création ; intégration FFF plus courte car pas à coder pour la partie affichage mais à packager en plugin.*
² *Woodmart : 59 $ tous les 6 mois pour les mises à jour et le support.*
³ *Une maintenance WordPress sérieuse demande ~1 heure tous les 15 jours : mises à jour, vérifications, sauvegardes testées.*

---

## 4. POUR QUI CHAQUE SCÉNARIO EST-IL FAIT ?

**Scénario A (sur-mesure)** est fait pour vous si :
- Le bénévole se contente de publier des actualités et d'ajouter des photos (pas de nouvelles pages)
- Le club veut minimiser les coûts récurrents et la dette technique
- Les évolutions sont ponctuelles (1 à 2 fois par an) et peuvent passer par le prestataire

**Scénario B (WordPress + Woodmart)** est fait pour vous si :
- Le bénévole a du temps et de l'appétence pour apprendre WordPress
- Le club prévoit des évolutions fréquentes (nouvelles pages, nouvelles sections)
- Un budget récurrent de ~500 €/an est acquis pour la maintenance

**Scénario C (WordPress + gratuit)** est fait pour vous si :
- Vous voulez la flexibilité WordPress sans la dépendance à un thème payant
- Vous acceptez un design un peu moins poussé au départ
- Un budget récurrent de ~400 €/an est acquis pour la maintenance

---

## 5. RECOMMANDATION

Pour un club associatif de la taille de l'ASJE, avec un budget de création de **3 000 € HT**, un bénévole administrateur non-technique, et des besoins qui devraient rester stables (publication d'actus, de photos, mise à jour ponctuelle des partenaires), nous recommandons le **Scénario A — Sur-mesure**.

**Les raisons principales** :
1. **Économie sur 5 ans** : ~2 700 € de moins que le scénario Kanboko Izarra
2. **Charge mentale réduite** : pas de mises à jour mensuelles de sécurité à surveiller
3. **Indépendance** : le site appartient au club, pas à un écosystème de plugins tiers
4. **Design équivalent** : le visuel de Kanboko Izarra est 100 % reproductible en sur-mesure — nous en avons déjà amorcé la base dans le dépôt

**Ce que vous perdez vs Kanboko Izarra** : la possibilité pour le bénévole de créer de nouvelles pages ou de modifier la mise en page sans passer par le prestataire. Sur un site vitrine de club amateur, cette capacité est rarement utilisée — le contenu évolue (actus, photos) mais pas la structure.

---

## 6. QUESTION À TRANCHER PAR LA DIRECTION

> **Le bénévole administrateur aura-t-il besoin, dans les 3 ans qui viennent, de créer de nouvelles pages ou de modifier la structure du site lui-même ?**

- **Non, il publiera surtout des actus et des photos** → Scénario A
- **Oui, régulièrement** → Scénario C (ou B si budget disponible)

---

*Note rédigée par SKenea pour éclairer le choix de la direction. Cette recommandation peut être révisée après échange en réunion de cadrage.*
