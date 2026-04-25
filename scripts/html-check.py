#!/usr/bin/env python3
"""
Vérifications HTML basiques :
- présence des balises structurelles (<html>, <head>, <body>)
- équilibre des balises majeures (<section>, <article>, <div>, <header>, <footer>, <main>, <nav>)
- attributs lang sur <html>
- présence d'un <title> et d'une <meta description>
- liens internes vers fichiers existants (mêmes répertoires)

Sortie : texte vide = OK, sinon liste de messages d'erreur (sortie code 1).
"""

import re
import sys
from pathlib import Path

# Force UTF-8 sur stdout pour Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

if len(sys.argv) < 2:
    sys.exit("Usage: html-check.py <fichier.html>")

path = Path(sys.argv[1])
if not path.exists():
    sys.exit(f"Fichier introuvable : {path}")

text = path.read_text(encoding='utf-8')
errors = []
warnings = []

# Skip total : pages de redirection minimales (meta http-equiv refresh)
if re.search(r'<meta[^>]+http-equiv\s*=\s*["\']?refresh', text, re.I):
    sys.exit(0)

# Skip total : fichiers de docs (HTML générés depuis Markdown, pas des pages site)
if 'docs' in path.parts:
    sys.exit(0)

# 1. Balises structurelles obligatoires
for tag in ('html', 'head', 'body'):
    if not re.search(rf'<{tag}[\s>]', text, re.I):
        errors.append(f"  ✖ Balise <{tag}> manquante")
    if not re.search(rf'</{tag}>', text, re.I):
        errors.append(f"  ✖ Balise </{tag}> manquante")

# 2. Équilibre des balises non-void
PAIRS = ('section', 'article', 'div', 'header', 'footer', 'main', 'nav', 'ul', 'ol', 'a', 'p', 'h1', 'h2', 'h3', 'span', 'button', 'form', 'select', 'textarea')
for tag in PAIRS:
    open_count = len(re.findall(rf'<{tag}[\s>]', text, re.I))
    close_count = len(re.findall(rf'</{tag}>', text, re.I))
    if open_count != close_count:
        errors.append(f"  ✖ Balise <{tag}> déséquilibrée : {open_count} ouverture(s) / {close_count} fermeture(s)")

# 3. Attribut lang sur <html>
m = re.search(r'<html(\s[^>]*)?>', text, re.I)
if m and 'lang=' not in (m.group(1) or ''):
    errors.append("  ✖ Attribut lang= manquant sur <html>")

# 4. <title> non vide
m = re.search(r'<title[^>]*>(.*?)</title>', text, re.I | re.S)
if not m or not m.group(1).strip():
    errors.append("  ✖ <title> manquant ou vide")

# 5. <meta description>
if not re.search(r'<meta\s+name=["\']description["\'][^>]*content=["\'][^"\']+["\']', text, re.I):
    warnings.append("  ⚠ <meta description> manquante (recommandé pour SEO)")

# 6. Liens internes : vérifier que les .html référencés existent
# (relatif au répertoire du fichier ou absolu /fr/, /eu/)
project_root = path.parent
while project_root.name != 'public' and project_root.parent != project_root:
    project_root = project_root.parent
if project_root.name == 'public':
    project_root = project_root.parent

for href in re.findall(r'href=["\'](/[^"\']+\.html?)["\']', text):
    target = (project_root / 'public' / href.lstrip('/')).resolve()
    if not target.exists():
        errors.append(f"  ✖ Lien cassé : {href} → fichier inexistant")

if errors or warnings:
    print(f"  Fichier {path}")
    for w in warnings:
        print(w)
    for e in errors:
        print(e)
sys.exit(1 if errors else 0)
