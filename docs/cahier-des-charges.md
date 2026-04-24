# Cahier des charges - Site Internet ASJ Espelette

**Projet :** Creation du site internet officiel de l'ASJ Espelette
**Version :** 1.0 - 16 fevrier 2026
**Domaine cible :** asjespelette.eus

---

## 1. Presentation generale

L'ASJ Espelette (club n FFF 523288, District Pyrenees-Atlantiques, Ligue Nouvelle-Aquitaine) souhaite la creation d'un site internet sur-mesure, bilingue francais/basque, destine a ses licencies, familles, supporters et partenaires.

- **Budget :** 1 500EUR - 3 000EUR
- **Mise en ligne visee :** Septembre 2026
- **Responsive :** Mobile, tablette, desktop
- **Administration :** Benevole non-technique

---

## 2. Structure du site

### Pages FR (`/fr/`)
| Page | Fichier | Description |
|------|---------|-------------|
| Accueil | `index.html` | Actus, matchs, reseaux sociaux, hero |
| Le Club | `club.html` | Histoire, bureau, trombinoscope coachs |
| Equipes | `equipes.html` | Competition + Animation, liens FFF/Sport Easy |
| Agenda | `agenda.html` | Iframe FFF calendrier/resultats |
| Galerie | `galerie.html` | Photos/videos avec filtres et lightbox |
| Partenaires | `partenaires.html` | Or/Argent/Bronze + offre PDF |
| Contact | `contact.html` | Formulaire + infos + carte OSM |
| Mentions legales | `mentions-legales.html` | RGPD, cookies, editeur |

### Pages EUS (`/eu/`)
| Page | Fichier |
|------|---------|
| Harrera | `index.html` |
| Kluba | `kluba.html` |
| Taldeak | `taldeak.html` |
| Egutegia | `egutegia.html` |
| Argazkiak | `argazkiak.html` |
| Bazkideak | `bazkideak.html` |
| Harremanetan jarri | `harremanetan.html` |

---

## 3. Arborescence du projet

```
SiteWebASJE/
|-- public/
|   |-- index.html          (redirection vers /fr/)
|   |-- fr/                  (pages francaises)
|   |-- eu/                  (pages euskara)
|-- src/
|   |-- css/
|   |   |-- main.css         (styles principaux + variables couleurs)
|   |   |-- responsive.css   (breakpoints mobile/tablette)
|   |-- js/
|   |   |-- main.js          (nav mobile, cookies, smooth scroll)
|   |   |-- galerie.js       (filtres + lightbox)
|   |   |-- contact.js       (validation formulaire)
|   |-- img/
|   |   |-- logos/           (logo club, favicon)
|   |   |-- coachs/          (photos educateurs)
|   |   |-- galerie/         (photos matchs/tournois/evenements)
|   |   |-- partenaires/     (logos partenaires)
|   |   |-- backgrounds/     (images hero, bannieres)
|   |-- fonts/               (typographies custom si besoin)
|-- admin/
|   |-- index.html           (interface admin simplifiee)
|-- assets/
|   |-- partenariat/         (PDF offre de partenariat)
|-- docs/
|   |-- cahier-des-charges.md
|   |-- questions-commanditaire.md
|-- .gitignore
```

---

## 4. Exigences techniques

- HTML5 / CSS3 / JavaScript vanilla (pas de framework)
- Responsive design (mobile-first)
- HTTPS obligatoire
- Anti-spam honeypot sur formulaire
- Cookie banner RGPD
- SEO : balises meta, structure semantique
- Performances : lazy loading images, CSS optimise

---

## 5. Couleurs (deduites du logo officiel ASJE + FFF)

Couleur des maillots declaree a la FFF : **BLEU**

```css
--color-primary: #0070A0     /* Bleu ASJE — couleur dominante du logo */
--color-primary-dark: #005580 /* Bleu fonce — bordures ecusson */
--color-primary-light: #1A8EC8 /* Bleu clair — hover, liens */
--color-secondary: #004A6E   /* Bleu marine — header, footer */
--color-accent: #80B8D8      /* Bleu pastel — badges animation */
```

Logo source : ecusson bleu et blanc "A.S.J.E / EZPELETA" avec ballon.
- FFF : `https://cdn-transverse.azureedge.net/phlogos/BC523288.jpg`
- Footeo : `https://s2.static-footeo.com/100/uploads/asjespelette/shield__75wt7fgru.png`

**A confirmer par le commanditaire. Version HD (SVG/PNG fond transparent) a fournir.**

---

## 6. Planning previsionnel

| Phase | Periode |
|-------|---------|
| Recueil des contenus | Mars - Avril 2026 |
| Maquettes & validation | Avril - Mai 2026 |
| Developpement | Mai - Juillet 2026 |
| Recette & corrections | Juillet - Aout 2026 |
| Mise en ligne | Septembre 2026 |
