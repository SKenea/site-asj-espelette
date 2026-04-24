"""Inject Google Fonts Inter, OG tags, proper favicon into all HTML pages."""
import re
import sys
from pathlib import Path

PAGES = {
    'public/fr/index.html':        ('fr', "ASJ Espelette — Club de Football Pays Basque", "Club de football d'Espelette (Pays Basque) depuis 1968 : équipes, matchs, résultats, actualités. FR / EUS.", "/fr/"),
    'public/fr/club.html':         ('fr', "Le Club — ASJ Espelette", "Histoire de l'ASJ Espelette, bureau et éducateurs du club de football d'Espelette depuis 1968.", "/fr/club.html"),
    'public/fr/equipes.html':      ('fr', "Équipes — ASJ Espelette", "Toutes les équipes de l'ASJ Espelette : Seniors, U13, U11, U9, U8, U7.", "/fr/equipes.html"),
    'public/fr/agenda.html':       ('fr', "Agenda & Résultats — ASJ Espelette", "Calendrier, résultats et classements de toutes les équipes ASJ Espelette en direct de la FFF.", "/fr/agenda.html"),
    'public/fr/galerie.html':      ('fr', "Galerie — ASJ Espelette", "Photos des matchs, tournois et événements de l'ASJ Espelette.", "/fr/galerie.html"),
    'public/fr/partenaires.html':  ('fr', "Partenaires — ASJ Espelette", "Les partenaires de l'ASJ Espelette. Devenez partenaire du club.", "/fr/partenaires.html"),
    'public/fr/contact.html':      ('fr', "Contact — ASJ Espelette", "Contactez l'ASJ Espelette. Stade Jean Eizaguirre, 64250 Espelette.", "/fr/contact.html"),
    'public/fr/mentions-legales.html': ('fr', "Mentions légales — ASJ Espelette", "Mentions légales du site de l'ASJ Espelette.", "/fr/mentions-legales.html"),
    'public/eu/index.html':        ('eu', "ASJ Ezpeleta — Futbol Kluba", "Ezpeletako futbol kluba 1968tik : taldeak, partidak, emaitzak, berriak. FR / EUS.", "/eu/"),
    'public/eu/kluba.html':        ('eu', "Kluba — ASJ Ezpeleta", "ASJ Ezpeletaren historia, bulegoa eta hezitzaileak.", "/eu/kluba.html"),
    'public/eu/taldeak.html':      ('eu', "Taldeak — ASJ Ezpeleta", "ASJ Ezpeletaren talde guztiak: Seniorrak, U13, U11, U9, U8, U7.", "/eu/taldeak.html"),
    'public/eu/egutegia.html':     ('eu', "Egutegia & Emaitzak — ASJ Ezpeleta", "Egutegia, emaitzak eta sailkapenak zuzenean FFF-tik.", "/eu/egutegia.html"),
    'public/eu/argazkiak.html':    ('eu', "Argazkiak — ASJ Ezpeleta", "ASJ Ezpeletaren partiden, txapelketen eta ekitaldien argazkiak.", "/eu/argazkiak.html"),
    'public/eu/bazkideak.html':    ('eu', "Bazkideak — ASJ Ezpeleta", "ASJ Ezpeletaren bazkideak.", "/eu/bazkideak.html"),
    'public/eu/harremanetan.html': ('eu', "Harremanetan jarri — ASJ Ezpeleta", "ASJ Ezpeletarekin harremanetan jarri.", "/eu/harremanetan.html"),
}

GOOGLE_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300;8..144,400;8..144,500;8..144,600;8..144,700;8..144,800&display=swap">'

def og_block(lang, title, desc, path):
    url = "https://asj-espelette.fr" + path
    locale = 'fr_FR' if lang == 'fr' else 'eu_ES'
    site = "ASJ Espelette" if lang == 'fr' else "ASJ Ezpeleta"
    return (
        f'<meta property="og:site_name" content="{site}">\n'
        f'    <meta property="og:type" content="website">\n'
        f'    <meta property="og:locale" content="{locale}">\n'
        f'    <meta property="og:title" content="{title}">\n'
        f'    <meta property="og:description" content="{desc}">\n'
        f'    <meta property="og:url" content="{url}">\n'
        f'    <meta property="og:image" content="https://asj-espelette.fr/src/img/logos/logo-asje.jpg">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:title" content="{title}">\n'
        f'    <meta name="twitter:description" content="{desc}">\n'
        f'    <meta name="twitter:image" content="https://asj-espelette.fr/src/img/logos/logo-asje.jpg">'
    )

def alt_lang(lang, path):
    if lang == 'fr':
        return path.replace('/fr/', '/eu/').replace('index.html', '') \
            .replace('club.html','kluba.html').replace('equipes.html','taldeak.html') \
            .replace('agenda.html','egutegia.html').replace('galerie.html','argazkiak.html') \
            .replace('partenaires.html','bazkideak.html').replace('contact.html','harremanetan.html') \
            .replace('mentions-legales.html','lege-aipamenak.html')
    return path.replace('/eu/', '/fr/').replace('index.html','') \
        .replace('kluba.html','club.html').replace('taldeak.html','equipes.html') \
        .replace('egutegia.html','agenda.html').replace('argazkiak.html','galerie.html') \
        .replace('bazkideak.html','partenaires.html').replace('harremanetan.html','contact.html')

def patch_file(path, lang, title, desc, path_rel):
    text = Path(path).read_text(encoding='utf-8')
    original = text

    alt = alt_lang(lang, path_rel)
    head_inject = '\n    ' + GOOGLE_FONTS + '\n    ' + og_block(lang, title, desc, path_rel) + \
                  f'\n    <link rel="alternate" hreflang="{"eu" if lang=="fr" else "fr"}" href="https://asj-espelette.fr{alt}">' + \
                  f'\n    <link rel="alternate" hreflang="{lang}" href="https://asj-espelette.fr{path_rel}">' + \
                  f'\n    <link rel="canonical" href="https://asj-espelette.fr{path_rel}">'

    # 1. Remove old favicon line (ico), 2. Add new favicon (jpg) + already-present head injection
    text = re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/jpeg" href="/src/img/logos/favicon.jpg">\n    <link rel="apple-touch-icon" href="/src/img/logos/logo-asje.jpg">', text)

    # Only inject if not already done (idempotent via preconnect marker)
    if 'fonts.googleapis.com' not in text:
        text = text.replace('</head>', head_inject + '\n</head>', 1)

    if text != original:
        Path(path).write_text(text, encoding='utf-8')
        print(f"Patched: {path}")
    else:
        print(f"Unchanged: {path}")

for p, meta in PAGES.items():
    if Path(p).exists():
        patch_file(p, *meta)
    else:
        print(f"Missing: {p}")
