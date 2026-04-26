#!/usr/bin/env bash
#
# Installe les hooks Git du projet via symlinks.
# Idempotent : peut être lancé plusieurs fois.
#
# Usage :
#   ./scripts/hooks/install.sh

set -e
cd "$(git rev-parse --show-toplevel)"

mkdir -p .git/hooks

for hook in pre-commit pre-push; do
    target=".git/hooks/$hook"
    source="../../scripts/hooks/$hook"

    if [ -L "$target" ] || [ -f "$target" ]; then
        rm -f "$target"
    fi

    ln -sf "$source" "$target"
    chmod +x "scripts/hooks/$hook" 2>/dev/null || true
    echo "  ✓ $hook installé"
done

echo ""
echo "Hooks Git installés. Pour bypasser un hook :"
echo "  git commit --no-verify   # bypass pre-commit"
echo "  git push --no-verify     # bypass pre-push"
