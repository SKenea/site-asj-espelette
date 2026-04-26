#!/usr/bin/env python3
"""
Analyse d'impact d'un changement Git.

Lit `git diff` (vs main par défaut) et déduit :
- les pages publiques potentiellement impactées (à tester manuellement)
- les composants JS/CSS modifiés et leurs zones d'usage
- le périmètre de tests E2E à relancer en priorité

Sortie : Markdown destiné à être posté en commentaire de PR via gh.

Usage :
  python scripts/impact.py                  # diff vs main
  python scripts/impact.py --base origin/main
  python scripts/impact.py --staged
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent

# Matrice de propagation : un fichier modifié → liste de zones touchées
# Une zone est une chaîne libre, on les regroupe pour le rapport
IMPACT_RULES = [
    # Fichiers globaux : impact maximal
    ('src/css/main.css',          ['toutes les pages publiques (FR + EUS)']),
    ('src/css/responsive.css',    ['toutes les pages publiques (FR + EUS)', 'rendu mobile']),
    ('src/js/main.js',            ['toutes les pages publiques', 'navigation', 'cookie banner', 'hamburger', 'view-tabs']),
    ('src/js/content.js',         ['home (carousel news)', 'galerie']),
    ('src/js/fff-integration.js', ['home (prochains matchs)', 'agenda (hero, classement, sous-tabs)']),

    # Fichiers admin
    ('admin/api.php',             ['console admin (login, articles, galerie, équipes)']),
    ('admin/fff-proxy.php',       ['agenda', 'home (prochains matchs)']),
    ('admin/fff-refresh.php',     ['cron de rafraîchissement (nécessite test serveur prod)']),
    ('admin/index.html',          ['console admin (UI complète)']),

    # Données
    ('data/equipes.json',         ['agenda (chips équipes, hero, classement)']),
    ('data/articles.json',        ['home (carousel news)']),
    ('data/galerie.json',         ['galerie']),

    # Config / déploiement
    ('router.php',                ['serveur dev local uniquement (pas d\'impact prod)']),
    ('.github/workflows/',        ['CI uniquement (pas d\'impact runtime)']),
    ('scripts/',                  ['outils dev (pas d\'impact runtime)']),
    ('tools/',                    ['outils dev (pas d\'impact runtime)']),
]

# Pages de tests Playwright correspondantes (à mentionner si la zone est touchée)
ZONE_TO_E2E = {
    'home': ['tests/e2e/smoke.spec.js (smoke /fr/, /eu/)', 'tests/e2e/agenda.spec.js (carousel news)'],
    'agenda': ['tests/e2e/agenda.spec.js (hero, chips, classement)'],
    'console admin': ['(pas de test E2E admin pour l\'instant — à ajouter)'],
    'toutes les pages publiques': ['tests/e2e/smoke.spec.js (17 pages)'],
    'rendu mobile': ['tests/e2e/smoke.spec.js + project=mobile'],
    'galerie': ['(pas de test E2E galerie pour l\'instant)'],
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8').stdout.strip()


def get_changed_files(base_ref, staged):
    if staged:
        return run(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR']).splitlines()
    # Trouve la base merge avec main
    base = run(['git', 'merge-base', 'HEAD', base_ref]) or base_ref
    return run(['git', 'diff', '--name-only', '--diff-filter=ACMR', f'{base}...HEAD']).splitlines()


def classify(files):
    impacts = {}  # zone → [files]
    untracked = []

    for f in files:
        f_norm = f.replace('\\', '/')
        matched = False
        for prefix, zones in IMPACT_RULES:
            if f_norm == prefix or f_norm.startswith(prefix.rstrip('/') + '/'):
                for z in zones:
                    impacts.setdefault(z, []).append(f_norm)
                matched = True
                break

        if matched:
            continue

        # Pages HTML : impact = la page elle-même
        if f_norm.startswith('public/fr/'):
            page = f_norm.replace('public/fr/', '/fr/')
            impacts.setdefault(f'page {page}', []).append(f_norm)
        elif f_norm.startswith('public/eu/'):
            page = f_norm.replace('public/eu/', '/eu/')
            impacts.setdefault(f'page {page}', []).append(f_norm)
        elif f_norm.startswith('docs/'):
            impacts.setdefault('documentation (pas d\'impact runtime)', []).append(f_norm)
        elif f_norm.startswith('tests/'):
            impacts.setdefault('tests (pas d\'impact runtime)', []).append(f_norm)
        else:
            untracked.append(f_norm)

    return impacts, untracked


def render_markdown(impacts, untracked, files):
    lines = []
    if not files:
        return "Aucun changement détecté.\n"

    # Estimation du niveau de risque
    risk = 'Faible'
    risk_emoji = '🟢'
    impact_keys = ' | '.join(impacts.keys()).lower()
    high_risk_keywords = ['toutes les pages', 'console admin', 'navigation']
    if any(k in impact_keys for k in high_risk_keywords):
        risk = 'Élevé'
        risk_emoji = '🔴'
    elif len(impacts) >= 3:
        risk = 'Moyen'
        risk_emoji = '🟠'

    lines.append(f"## Analyse d'impact — niveau de risque : {risk_emoji} {risk}")
    lines.append("")
    lines.append(f"**{len(files)} fichier(s) modifié(s)** touchant **{len(impacts)} zone(s)**.")
    lines.append("")

    if impacts:
        lines.append("### Zones impactées")
        lines.append("")
        for zone, fs in sorted(impacts.items(), key=lambda x: -len(x[1])):
            lines.append(f"- **{zone}**")
            for f in fs[:3]:
                lines.append(f"  - `{f}`")
            if len(fs) > 3:
                lines.append(f"  - … et {len(fs) - 3} autre(s)")
        lines.append("")

    # E2E à relancer
    e2e_relevant = set()
    for zone in impacts:
        for key, suites in ZONE_TO_E2E.items():
            if key in zone.lower():
                e2e_relevant.update(suites)

    if e2e_relevant:
        lines.append("### Suites E2E à valider en priorité")
        lines.append("")
        for s in sorted(e2e_relevant):
            lines.append(f"- {s}")
        lines.append("")

    # Checklist test manuel
    lines.append("### Checklist de validation manuelle")
    lines.append("")
    if 'toutes les pages publiques' in str(impacts) or 'toutes les pages publiques (FR + EUS)' in impacts:
        lines.append("- [ ] Vérifier visuellement les 7 pages FR + 7 pages EUS")
    else:
        for zone, fs in impacts.items():
            if zone.startswith('page '):
                lines.append(f"- [ ] Tester la page `{zone[5:]}`")
    if 'agenda' in str(impacts).lower():
        lines.append("- [ ] Agenda : hero, chips équipes, sous-tabs Précédent/Ce week-end/Suivant, classement")
    if 'home' in str(impacts).lower() or 'page /fr/' in impacts:
        lines.append("- [ ] Home : compte à rebours, carousel news, prochains matchs")
    if 'console admin' in str(impacts).lower():
        lines.append("- [ ] Admin : login, CRUD article, CRUD photo, CRUD équipes")
    if 'rendu mobile' in str(impacts).lower() or 'toutes les pages' in str(impacts).lower():
        lines.append("- [ ] Vérifier mobile 375px (au moins home + agenda)")
    if 'cron' in str(impacts).lower():
        lines.append("- [ ] **À tester en prod** : appel manuel à `/admin/fff-refresh.php?key=…`")
    lines.append("- [ ] Switch FR ↔ EUS sur les pages touchées")
    lines.append("")

    if untracked:
        lines.append("### Fichiers non classifiés (à examiner manuellement)")
        for f in untracked:
            lines.append(f"- `{f}`")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='main', help='Branche de référence pour le diff (défaut: main)')
    parser.add_argument('--staged', action='store_true', help='Analyse les fichiers staged au lieu du diff vs main')
    args = parser.parse_args()

    files = get_changed_files(args.base, args.staged)
    impacts, untracked = classify(files)
    output = render_markdown(impacts, untracked, files)
    print(output)


if __name__ == '__main__':
    main()
