#!/usr/bin/env sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "Uso: ./deploy/backup-client.sh <slug> <arquivo-env> <diretorio-backup>"
  exit 1
fi

slug="$1"
env_file="$2"
backup_dir="$3"
project="concessionaria_${slug}"
timestamp="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$backup_dir"
docker compose -p "$project" --env-file "$env_file" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$backup_dir/${slug}-${timestamp}.sql.gz"

echo "Backup criado: $backup_dir/${slug}-${timestamp}.sql.gz"
