#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-codex/pedalzinho-dourado-acop-tenant}"
INSTALL_DIR="${INSTALL_DIR:-/opt/concessionarias/autos}"
ENV_FILE="$INSTALL_DIR/deploy/clientes/autos.env"
PROJECT_NAME="concessionaria_autos"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root." >&2
  exit 1
fi

for command_name in git docker curl; do
  command -v "$command_name" >/dev/null || { echo "Comando ausente: $command_name" >&2; exit 1; }
done

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "Instalação não encontrada em $INSTALL_DIR. Rode install-demo.sh somente na primeira instalação." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Configuração protegida não encontrada: $ENV_FILE" >&2
  exit 1
fi

git -C "$INSTALL_DIR" fetch origin "$DEPLOY_BRANCH"
git -C "$INSTALL_DIR" checkout "$DEPLOY_BRANCH"
git -C "$INSTALL_DIR" pull --ff-only origin "$DEPLOY_BRANCH"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cd "$INSTALL_DIR"
docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" up -d --build

for attempt in $(seq 1 45); do
  if curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT:-4101}/api/branding" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 45 ]]; then
    docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" logs --tail=160 app
    echo "A aplicação não ficou saudável. Verifique os logs acima." >&2
    exit 1
  fi
  sleep 2
done

docker exec cardgamestore_nginx nginx -t
docker exec cardgamestore_nginx nginx -s reload

echo
echo "Atualização concluída: https://${CLIENT_DOMAIN:-autos.3esysten.com.br}"
echo "Banco, volume, configurações e senhas foram preservados."
docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" ps
