#!/usr/bin/env bash

set -euo pipefail

BACKUP_DIR="${1:-}"
if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Uso: npm run backup:verify -- /ruta/al/backup" >&2
  exit 1
fi

for file in roles.sql schema.sql data.sql SHA256SUMS manifest.txt SHA256SUMS-STORAGE storage-manifest.json; do
  if [[ ! -s "$BACKUP_DIR/$file" ]]; then
    echo "Error: falta $file o esta vacio." >&2
    exit 1
  fi
done

(
  cd "$BACKUP_DIR"
  shasum -a 256 -c SHA256SUMS
  if [[ -s SHA256SUMS-STORAGE ]]; then
    shasum -a 256 -c SHA256SUMS-STORAGE
  fi
)

echo "Backup verificable: $BACKUP_DIR"
grep -E '^(created_at_utc|project_ref|storage)=' "$BACKUP_DIR/manifest.txt"
