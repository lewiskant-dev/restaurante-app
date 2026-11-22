#!/usr/bin/env bash

set -euo pipefail
umask 077

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-}"
DESTINATION_DIR="${2:-}"

usage() {
  echo "Uso: npm run backup:export -- /ruta/al/backup /Volumes/destino" >&2
}

if [[ -z "$BACKUP_DIR" || -z "$DESTINATION_DIR" ]]; then
  usage
  exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "Error: no existe el directorio de backup: $BACKUP_DIR" >&2
  exit 1
fi

if [[ ! -d "$DESTINATION_DIR" ]]; then
  echo "Error: crea o monta primero el directorio de destino: $DESTINATION_DIR" >&2
  exit 1
fi

if ! command -v hdiutil >/dev/null 2>&1; then
  echo "Error: esta exportacion cifrada requiere hdiutil de macOS." >&2
  exit 1
fi

SOURCE_DEVICE="$(df -P "$BACKUP_DIR" | awk 'NR == 2 {print $1}')"
DESTINATION_DEVICE="$(df -P "$DESTINATION_DIR" | awk 'NR == 2 {print $1}')"
if [[ -z "$SOURCE_DEVICE" || -z "$DESTINATION_DEVICE" ]]; then
  echo "Error: no se pudo identificar el volumen de origen o destino." >&2
  exit 1
fi

if [[ "$SOURCE_DEVICE" == "$DESTINATION_DEVICE" ]]; then
  echo "Error: el destino esta en el mismo volumen que el backup original." >&2
  echo "Usa un disco externo montado en /Volumes para obtener una segunda copia real." >&2
  exit 1
fi

"$PROJECT_ROOT/scripts/verify-backup.sh" "$BACKUP_DIR"

BACKUP_NAME="$(basename "$(cd "$(dirname "$BACKUP_DIR")" && pwd)/$(basename "$BACKUP_DIR")")"
OUTPUT="$DESTINATION_DIR/NexoBackup-$BACKUP_NAME.dmg"
CHECKSUM="$OUTPUT.sha256"

if [[ -e "$OUTPUT" || -e "$CHECKSUM" ]]; then
  echo "Error: ya existe una exportacion con ese nombre en el destino." >&2
  exit 1
fi

read -r -s -p "Contrasena de cifrado: " PASSWORD
echo
read -r -s -p "Repite la contrasena: " PASSWORD_CONFIRMATION
echo

cleanup() {
  unset PASSWORD PASSWORD_CONFIRMATION
}
trap cleanup EXIT

if [[ -z "$PASSWORD" ]]; then
  echo "Error: la contrasena no puede estar vacia." >&2
  exit 1
fi

if [[ "$PASSWORD" != "$PASSWORD_CONFIRMATION" ]]; then
  echo "Error: las contrasenas no coinciden." >&2
  exit 1
fi

printf '%s' "$PASSWORD" | hdiutil create \
  -srcfolder "$BACKUP_DIR" \
  -volname "Nexo Backup $BACKUP_NAME" \
  -format UDZO \
  -encryption AES-256 \
  -stdinpass \
  "$OUTPUT"

hdiutil verify "$OUTPUT"
shasum -a 256 "$OUTPUT" > "$CHECKSUM"
(
  cd "$DESTINATION_DIR"
  shasum -a 256 -c "$(basename "$CHECKSUM")"
)

chmod 600 "$OUTPUT" "$CHECKSUM"
echo
echo "Segunda copia cifrada y verificada: $OUTPUT"
echo "Dispositivo de destino: $DESTINATION_DEVICE"
echo "Guarda la contrasena fuera de este Mac; sin ella la copia no puede recuperarse."
