#!/usr/bin/env python3
"""
Vérification de cohérence CSS :
- toutes les var(--xxx) utilisées sont définies quelque part (:root ou autre)
- toutes les classes référencées dans les HTML existent en CSS (warning, pas bloquant)
- détection des variables CSS définies mais jamais utilisées (warning)

Bloquant uniquement sur les variables var() utilisées sans définition.

Sortie code 1 si erreurs bloquantes.
"""

import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
CSS_DIR = ROOT / 'src' / 'css'
HTML_DIRS = [ROOT / 'public', ROOT / 'admin']

# 1. Lire toutes les CSS et extraire :
#    - les variables définies : --xxx: ...
#    - les variables utilisées : var(--xxx)

defined_vars = set()
used_vars = set()
all_classes_defined = set()

# Variables fournies inline (style="--xxx: ..."), donc considérées comme définies
INLINE_PROVIDED_VARS = {'--hero-image'}

def collect_from_css(text):
    for m in re.finditer(r'(--[\w-]+)\s*:', text):
        defined_vars.add(m.group(1))
    for m in re.finditer(r'var\((--[\w-]+)', text):
        used_vars.add(m.group(1))
    for m in re.finditer(r'\.([a-zA-Z_][\w-]*)', text):
        all_classes_defined.add(m.group(1))

# CSS dans src/css/
for css_file in CSS_DIR.rglob('*.css'):
    collect_from_css(css_file.read_text(encoding='utf-8'))

# CSS inline dans les HTML (<style>...</style>)
for html_dir in HTML_DIRS:
    for html_file in html_dir.rglob('*.html'):
        text = html_file.read_text(encoding='utf-8')
        for m in re.finditer(r'<style[^>]*>(.*?)</style>', text, re.S):
            collect_from_css(m.group(1))

# Variables fournies par inline style="..."
for html_dir in HTML_DIRS:
    for html_file in html_dir.rglob('*.html'):
        text = html_file.read_text(encoding='utf-8')
        for m in re.finditer(r'style=["\']([^"\']*)["\']', text):
            for vm in re.finditer(r'(--[\w-]+)\s*:', m.group(1)):
                INLINE_PROVIDED_VARS.add(vm.group(1))

defined_vars |= INLINE_PROVIDED_VARS

errors = []
warnings = []

# 2. Variables utilisées non définies → ERREUR
undefined = used_vars - defined_vars
if undefined:
    for v in sorted(undefined):
        errors.append(f"  ✖ Variable CSS utilisée mais non définie : {v}")

# 3. Variables définies non utilisées → WARNING
unused = defined_vars - used_vars
# On exclut les tokens M3 standard (souvent définis pour usage futur)
exclude_unused_prefix = ('--md-sys-', '--color-')
unused_relevant = [v for v in unused if not any(v.startswith(p) for p in exclude_unused_prefix)]
if unused_relevant:
    for v in sorted(unused_relevant):
        warnings.append(f"  ⚠ Variable CSS définie mais jamais utilisée : {v}")

# 4. Classes utilisées dans HTML mais non définies en CSS → WARNING (souvent classes JS)
classes_in_html = set()
for html_dir in HTML_DIRS:
    for html_file in html_dir.rglob('*.html'):
        text = html_file.read_text(encoding='utf-8')
        for m in re.finditer(r'class\s*=\s*["\']([^"\']+)["\']', text):
            for cls in m.group(1).split():
                classes_in_html.add(cls)

# Classes système qu'on ignore (générées par JS, BEM modifiers)
ignore_class_patterns = (
    re.compile(r'^js-'),
    re.compile(r'^is-'),
    re.compile(r'^has-'),
    re.compile(r'^md-'),  # md-* gérés par M3 tokens
    re.compile(r'^aria-'),
)

undefined_classes = []
for cls in sorted(classes_in_html):
    if cls in all_classes_defined:
        continue
    if any(p.match(cls) for p in ignore_class_patterns):
        continue
    undefined_classes.append(cls)

# Limite à 5 pour ne pas spammer
if undefined_classes:
    for cls in undefined_classes[:5]:
        warnings.append(f"  ⚠ Classe HTML non définie en CSS : .{cls}")
    if len(undefined_classes) > 5:
        warnings.append(f"  ⚠ ... et {len(undefined_classes) - 5} autre(s) classe(s) non définie(s)")

# Sortie
for e in errors:
    print(e)
for w in warnings:
    print(w)

if errors:
    sys.exit(1)
sys.exit(0)
