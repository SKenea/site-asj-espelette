#!/usr/bin/env bash
#
# Lance le serveur PHP local pour le développement.
# Cross-platform : utilise tools/php/php.exe sur Windows si présent, sinon php du PATH.
#
# Port : 8000 (différent de 8765 utilisé par Playwright pour éviter les conflits).
#
# Usage :
#   ./scripts/dev.sh
#   npm run dev

set -e
cd "$(dirname "$0")/.."

if [ -x "tools/php/php.exe" ]; then
    PHP="tools/php/php.exe"
    # PHPRC plutôt que -c : le flag -c casse l'héritage des env vars sur Windows
    # (variables ADMIN_USER / ADMIN_PASS ne remontent pas à getenv() dans router).
    export PHPRC="$(pwd)/tools/php"
    PHP_ARGS=()
elif command -v php >/dev/null 2>&1; then
    PHP="php"
    PHP_ARGS=()
else
    echo "✖ PHP introuvable (ni tools/php/php.exe ni php du PATH)" >&2
    exit 1
fi

# Credentials admin en local : login=admin, mot de passe=admin (volontairement simple
# pour le dev). En prod, l'hébergeur définit ses propres ADMIN_USER / ADMIN_PASS — la
# config en dur ici n'a aucun effet sur la prod.
export ADMIN_USER="${ADMIN_USER:-admin}"
export ADMIN_PASS="${ADMIN_PASS:-\$2y\$10\$4A9SoIil6MXZ4Uo7bkkjDuBFwzo9Ya/4BUL.N/jW8N.TZ3oTsNwv6}"

echo ""
echo "  Serveur dev démarré sur http://127.0.0.1:8000"
echo ""
echo "  → Site public  : http://127.0.0.1:8000/fr/"
echo "  → Site euskara : http://127.0.0.1:8000/eu/"
echo "  → Admin        : http://127.0.0.1:8000/admin/"
echo ""
echo "  Login admin local : $ADMIN_USER / admin"
echo ""
echo "  Ctrl+C pour arrêter."
echo ""

"$PHP" "${PHP_ARGS[@]}" -S 127.0.0.1:8000 router.php
