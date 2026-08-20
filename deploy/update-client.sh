#!/usr/bin/env bash
set -Eeuo pipefail

[[ $# -eq 1 ]] || { echo "Uso: $0 <slug>"; exit 1; }
slug="$1"
[[ "$slug" =~ ^[a-z0-9]+([_-][a-z0-9]+)*$ ]] || { echo "Slug invalido." >&2; exit 1; }

export INSTALL_DIR="${INSTALL_DIR:-/opt/concessionarias/${slug}}"
export DEPLOY_BRANCH="${DEPLOY_BRANCH:-codex/pedalzinho-dourado-acop-tenant}"
env_file="${INSTALL_DIR}/deploy/clientes/${slug}.env"
project="concessionaria_${slug}"

[[ "$(id -u)" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }
[[ -d "$INSTALL_DIR/.git" && -f "$env_file" ]] || { echo "Instalacao $slug nao encontrada." >&2; exit 1; }

git -C "$INSTALL_DIR" fetch origin "$DEPLOY_BRANCH"
git -C "$INSTALL_DIR" checkout "$DEPLOY_BRANCH"
git -C "$INSTALL_DIR" pull --ff-only origin "$DEPLOY_BRANCH"

if ! git lfs version >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y git-lfs
fi
git -C "$INSTALL_DIR" lfs install --local
git -C "$INSTALL_DIR" lfs pull origin "$DEPLOY_BRANCH"

set -a
# shellcheck disable=SC1090
. "$env_file"
set +a

cd "$INSTALL_DIR"
docker compose -p "$project" --env-file "$env_file" up -d --build
for attempt in $(seq 1 45); do
  curl --fail --silent "http://127.0.0.1:${APP_PORT}/api/branding" >/dev/null && break
  [[ "$attempt" -lt 45 ]] || { docker compose -p "$project" --env-file "$env_file" logs --tail=160 app; exit 1; }
  sleep 2
done

docker exec "${NGINX_CONTAINER:-cardgamestore_nginx}" nginx -t
docker exec "${NGINX_CONTAINER:-cardgamestore_nginx}" nginx -s reload
echo "Atualizacao concluida: https://${CLIENT_DOMAIN}"
