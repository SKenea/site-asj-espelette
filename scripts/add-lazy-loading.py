#!/usr/bin/env python3
"""
Ajoute loading="lazy" aux <img> hors viewport initial dans les pages publiques.

Règles :
- Garder eager : class="logo-img" (logo header, top of page, LCP-critical)
- Garder eager : src="" (lightbox-img, chargé dynamiquement au clic)
- Lazy partout ailleurs : footer-logo, coachs, partenaires, news cards, galerie

Idempotent : si loading="lazy" est déjà présent, ne touche pas.

Usage :
    python scripts/add-lazy-loading.py
"""
import re
import sys
from pathlib import Path

PUBLIC_DIR = Path(__file__).parent.parent / "public"

# Pattern : <img ... > en une seule ligne
IMG_RE = re.compile(r'<img\b([^>]*)>', re.IGNORECASE)


def should_lazy(attrs: str) -> bool:
    """Décide si on ajoute loading=lazy à ce <img>."""
    # Déjà un loading attr → on ne touche pas
    if re.search(r'\bloading\s*=', attrs, re.IGNORECASE):
        return False
    # Logo header LCP-critical → eager
    if re.search(r'class\s*=\s*["\'][^"\']*\blogo-img\b', attrs, re.IGNORECASE):
        return False
    # src vide (lightbox dynamique) → pas la peine
    if re.search(r'src\s*=\s*["\']\s*["\']', attrs):
        return False
    return True


def process_file(path: Path) -> int:
    """Retourne le nombre de modifications."""
    text = path.read_text(encoding='utf-8')
    count = 0

    def replace(match):
        nonlocal count
        attrs = match.group(1)
        if should_lazy(attrs):
            count += 1
            return f'<img{attrs} loading="lazy">'
        return match.group(0)

    new_text = IMG_RE.sub(replace, text)
    if count > 0:
        path.write_text(new_text, encoding='utf-8')
    return count


def main():
    total = 0
    for html_file in sorted(PUBLIC_DIR.rglob("*.html")):
        n = process_file(html_file)
        if n > 0:
            print(f"  {html_file.relative_to(PUBLIC_DIR.parent)} : {n} <img> -> lazy")
            total += n
    print(f"\nTotal : {total} balises <img> mises a jour avec loading=\"lazy\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
