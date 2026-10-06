#!/usr/bin/env bash
# Builds build/space/: exactly the files the Hugging Face Space needs, and
# nothing else (no venv, tests, .env, old files, local scan storage).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=build/space
rm -rf "$OUT"
mkdir -p "$OUT/deploy"

cp Dockerfile requirements.txt requirements-ml.txt alembic.ini "$OUT/"
cp deploy/space_README.md "$OUT/README.md"
cp deploy/prefetch_models.py "$OUT/deploy/"

# Allow-list: only source files, never venvs or caches.
find backend migrations -type f \( -name '*.py' -o -name '*.mako' \) \
  -not -path '*/venv/*' -not -path '*/.venv/*' -not -path '*/__pycache__/*' -print0 \
  | xargs -0 cp --parents -t "$OUT"

# Safety net: refuse to produce a bundle that could leak secrets.
if find "$OUT" \( -name '.env' -o -name '*.sqlite3' -o -name '*.pem' \) | grep -q .; then
  echo "ERROR: bundle contains a secret-like file" >&2; exit 1
fi

echo "Bundle written to $OUT:"
(cd "$OUT" && find . -type f | sort)
