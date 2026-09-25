#!/bin/bash
# Pousse les données générées vers la branche `data` de GitHub.
# Usage : ./scripts/push_data.sh

set -e

DATA_FILE="src/data/traffic_data.json"
TARGET_PATH="data/traffic_data.json"
BRANCH="data"

if [ ! -f "$DATA_FILE" ]; then
  echo "❌ Fichier $DATA_FILE introuvable. Lancez d'abord scripts/fetch_data.py"
  exit 1
fi

# Sauvegarde du répertoire courant
ORIGINAL_DIR=$(pwd)

# Créer un worktree temporaire sur la branche data
TEMP_DIR=$(mktemp -d)
git fetch origin "$BRANCH" 2>/dev/null || true
git worktree add "$TEMP_DIR" "$BRANCH" 2>/dev/null || {
  # La branche n'existe pas encore en local : la créer
  git worktree add -b "$BRANCH" "$TEMP_DIR"
}

# Copier le fichier
mkdir -p "$TEMP_DIR/data"
cp "$DATA_FILE" "$TEMP_DIR/$TARGET_PATH"

# Commit + push
cd "$TEMP_DIR"
git add "$TARGET_PATH"
if git diff --staged --quiet; then
  echo "ℹ️  Aucun changement dans $TARGET_PATH"
else
  git commit -m "data: update $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin "$BRANCH"
  echo "✅ Données poussées sur la branche '$BRANCH'"
fi

# Nettoyage
cd "$ORIGINAL_DIR"
git worktree remove "$TEMP_DIR" --force 2>/dev/null || true