#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Uso: ./deploy/deploy-client.sh <slug> <arquivo-env>"
  exit 1
fi

slug="$1"
env_file="$2"

case "$slug" in
  *[!a-z0-9_-]*|'')
    echo "Slug inválido. Use somente letras minúsculas, números, _ e -."
    exit 1
    ;;
esac

if [ ! -f "$env_file" ]; then
  echo "Arquivo de ambiente não encontrado: $env_file"
  exit 1
fi

project="concessionaria_${slug}"
docker compose -p "$project" --env-file "$env_file" up -d --build
docker compose -p "$project" --env-file "$env_file" ps

echo "Stack isolada criada: $project"
