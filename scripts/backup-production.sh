#!/usr/bin/env bash

set -euo pipefail
umask 077

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${NEXO_BACKUP_ROOT:-$HOME/NexoBackups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node.js y npx son necesarios para ejecutar Supabase CLI." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Supabase CLI necesita Docker para generar el dump." >&2
  echo "Instala Docker Desktop y vuelve a ejecutar npm run backup:prod." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker esta instalado, pero no esta iniciado." >&2
  exit 1
fi

case "$BACKUP_ROOT" in
  "$PROJECT_ROOT"|"$PROJECT_ROOT"/*)
    echo "Error: el backup debe guardarse fuera del repositorio." >&2
    exit 1
    ;;
esac

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_ROOT" "$BACKUP_DIR"

echo "Copia de produccion de Nexo"
echo "Destino: $BACKUP_DIR"
read -r -p "URI Transaction pooler con [YOUR-PASSWORD]: " NEXO_DB_URL_TEMPLATE
read -r -s -p "Database password: " NEXO_DB_PASSWORD
echo

if [[ "$NEXO_DB_URL_TEMPLATE" != postgresql://* && "$NEXO_DB_URL_TEMPLATE" != postgres://* ]]; then
  echo "Error: la conexion debe empezar por postgresql:// o postgres://." >&2
  exit 1
fi

if [[ "$NEXO_DB_URL_TEMPLATE" != *"[YOUR-PASSWORD]"* && "$NEXO_DB_URL_TEMPLATE" != *"[YOUR-DATABASE-PASSWORD]"* ]]; then
  echo "Error: copia la URI original de Supabase sin sustituir [YOUR-PASSWORD]." >&2
  exit 1
fi

if [[ "$NEXO_DB_URL_TEMPLATE" == *"@db."* ]]; then
  echo "Error: la conexion directa requiere IPv6 en esta red." >&2
  echo "Usa Connect > Transaction pooler en el panel de Supabase." >&2
  exit 1
fi

ENCODED_DB_PASSWORD="$(printf '%s' "$NEXO_DB_PASSWORD" | node -e "
  let value = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { value += chunk; });
  process.stdin.on('end', () => process.stdout.write(encodeURIComponent(value)));
")"
NEXO_DB_URL="${NEXO_DB_URL_TEMPLATE/\[YOUR-DATABASE-PASSWORD\]/$ENCODED_DB_PASSWORD}"
NEXO_DB_URL="${NEXO_DB_URL/\[YOUR-PASSWORD\]/$ENCODED_DB_PASSWORD}"

cleanup() {
  unset NEXO_DB_URL NEXO_DB_URL_TEMPLATE NEXO_DB_PASSWORD ENCODED_DB_PASSWORD
}
trap cleanup EXIT

run_supabase() {
  npx --yes supabase@latest "$@"
}

run_supabase db dump --remote="$NEXO_DB_URL" -f "$BACKUP_DIR/roles.sql" --role-only
run_supabase db dump --remote="$NEXO_DB_URL" -f "$BACKUP_DIR/schema.sql"
run_supabase db dump \
  --remote="$NEXO_DB_URL" \
  -f "$BACKUP_DIR/data.sql" \
  --use-copy \
  --data-only \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"

for file in roles.sql schema.sql data.sql; do
  if [[ ! -s "$BACKUP_DIR/$file" ]]; then
    echo "Error: $file esta vacio." >&2
    exit 1
  fi
done

(
  cd "$BACKUP_DIR"
  shasum -a 256 roles.sql schema.sql data.sql > SHA256SUMS
  shasum -a 256 -c SHA256SUMS
)

cat > "$BACKUP_DIR/manifest.txt" <<EOF
created_at_utc=$STAMP
project_ref=ajrtocaqfmqgafdzglxb
database=roles.sql,schema.sql,data.sql
storage=storage/albaranes,storage/guest-menu
verification=SHA256SUMS
EOF

node --env-file="$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/scripts/backup-storage.mjs" "$BACKUP_DIR"

echo
echo "Backup de base de datos completado: $BACKUP_DIR"
echo "Backup de Storage completado: albaranes y guest-menu"
