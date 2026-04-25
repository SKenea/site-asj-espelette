#!/usr/bin/env bash
#
# Lint global du projet ASJ Espelette.
#
# Usage :
#   ./scripts/lint.sh           # lint tout
#   ./scripts/lint.sh --staged  # lint uniquement les fichiers staged (pre-commit)
#   ./scripts/lint.sh --diff    # lint les fichiers modifiés vs main (pre-PR)
#
# Codes retour :
#   0 = tout est OK
#   1 = au moins une erreur
#
# Outils requis :
#   - PHP CLI (tools/php/php.exe en local Windows, php en CI Linux)
#   - Node.js (pour --check JS)
#   - Python 3 (pour parse JSON et analyse CSS)

set -uo pipefail

cd "$(dirname "$0")/.."

# Résolution du binaire PHP : priorité au portable local
if [ -x "tools/php/php.exe" ]; then
    PHP="tools/php/php.exe"
elif command -v php >/dev/null 2>&1; then
    PHP="php"
else
    echo "✖ PHP introuvable" >&2
    exit 1
fi

# Sélection des fichiers selon le mode
case "${1:-all}" in
    --staged)
        FILES=$(git diff --cached --name-only --diff-filter=ACMR)
        ;;
    --diff)
        BASE=$(git merge-base HEAD main 2>/dev/null || echo "main")
        FILES=$(git diff --name-only --diff-filter=ACMR "$BASE"...HEAD)
        ;;
    all|"")
        FILES=$(git ls-files)
        ;;
    *)
        echo "Usage: $0 [--staged|--diff|all]" >&2
        exit 2
        ;;
esac

if [ -z "$FILES" ]; then
    echo "Aucun fichier à lint."
    exit 0
fi

ERRORS=0
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✖\033[0m %s\n" "$1"; ERRORS=$((ERRORS+1)); }
info() { printf "\033[1m▶ %s\033[0m\n" "$1"; }

# 1. PHP — lint syntaxe
info "PHP lint"
PHP_FILES=$(echo "$FILES" | grep -E '\.php$' || true)
if [ -n "$PHP_FILES" ]; then
    while IFS= read -r f; do
        [ -f "$f" ] || continue
        if "$PHP" -l "$f" >/dev/null 2>&1; then
            ok "$f"
        else
            "$PHP" -l "$f" 2>&1 | grep -E 'error|Parse' | head -3
            fail "$f"
        fi
    done <<< "$PHP_FILES"
else
    echo "  (aucun .php modifié)"
fi

# 2. JSON — parse
info "JSON parse"
JSON_FILES=$(echo "$FILES" | grep -E '\.json$' || true)
if [ -n "$JSON_FILES" ]; then
    while IFS= read -r f; do
        [ -f "$f" ] || continue
        if python -c "import json,sys; json.load(open(sys.argv[1],encoding='utf-8'))" "$f" 2>/dev/null; then
            ok "$f"
        else
            python -c "import json,sys; json.load(open(sys.argv[1],encoding='utf-8'))" "$f" 2>&1 | head -3
            fail "$f"
        fi
    done <<< "$JSON_FILES"
else
    echo "  (aucun .json modifié)"
fi

# 3. JS — node --check (parse syntaxe)
info "JS syntax"
JS_FILES=$(echo "$FILES" | grep -E '\.js$' | grep -v 'node_modules' || true)
if [ -n "$JS_FILES" ]; then
    if command -v node >/dev/null 2>&1; then
        while IFS= read -r f; do
            [ -f "$f" ] || continue
            if node --check "$f" 2>/dev/null; then
                ok "$f"
            else
                node --check "$f" 2>&1 | head -3
                fail "$f"
            fi
        done <<< "$JS_FILES"
    else
        echo "  (node introuvable, lint JS skippé)"
    fi
else
    echo "  (aucun .js modifié)"
fi

# 4. HTML — vérifications légères (tags non fermés, attributs orphelins)
info "HTML basic checks"
HTML_FILES=$(echo "$FILES" | grep -E '\.html$' || true)
if [ -n "$HTML_FILES" ]; then
    while IFS= read -r f; do
        [ -f "$f" ] || continue
        msg=$(python scripts/html-check.py "$f" 2>&1)
        rc=$?
        if [ $rc -eq 0 ]; then
            if [ -n "$msg" ]; then echo "$msg"; fi
            ok "$f"
        else
            echo "$msg"
            fail "$f"
        fi
    done <<< "$HTML_FILES"
else
    echo "  (aucun .html modifié)"
fi

# 5. CSS — variables non définies
info "CSS variable check"
if [ -f "scripts/css-check.py" ]; then
    if python scripts/css-check.py 2>&1; then
        ok "Variables CSS cohérentes"
    else
        fail "Variables CSS incohérentes"
    fi
fi

# Résumé
echo ""
if [ "$ERRORS" -eq 0 ]; then
    printf "\033[32m✓ Lint OK (%d fichier(s) vérifié(s))\033[0m\n" "$(echo "$FILES" | wc -l)"
    exit 0
else
    printf "\033[31m✖ %d erreur(s) détectée(s)\033[0m\n" "$ERRORS"
    exit 1
fi
