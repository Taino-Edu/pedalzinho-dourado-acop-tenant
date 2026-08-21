#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="${REPOSITORY_URL:-https://github.com/Taino-Edu/pedalzinho-dourado-acop-tenant.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-codex/pedalzinho-dourado-acop-tenant}"
INSTALL_DIR="${INSTALL_DIR:-/opt/concessionarias/autos}"
ENV_FILE="$INSTALL_DIR/deploy/clientes/autos.env"
NGINX_FILE="/opt/tenant-erp/deploy/nginx/autosuite-autos.conf"
DOMAIN="autos.3esysten.com.br"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root." >&2
  exit 1
fi

for command_name in git docker openssl curl; do
  command -v "$command_name" >/dev/null || { echo "Comando ausente: $command_name" >&2; exit 1; }
done

docker network inspect deploy_cardgame_network >/dev/null 2>&1 || {
  echo "A rede deploy_cardgame_network nao existe. O proxy atual nao sera alterado." >&2
  exit 1
}

mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" fetch origin "$DEPLOY_BRANCH"
  git -C "$INSTALL_DIR" checkout "$DEPLOY_BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$DEPLOY_BRANCH"
else
  git clone --branch "$DEPLOY_BRANCH" --single-branch "$REPOSITORY_URL" "$INSTALL_DIR"
fi

mkdir -p "$(dirname "$ENV_FILE")"
if [[ ! -f "$ENV_FILE" ]]; then
  database_password="$(openssl rand -hex 24)"
  dashboard_password="$(openssl rand -base64 24 | tr -d '\n')"
  dashboard_secret="$(openssl rand -hex 32)"
  platform_password="$(openssl rand -base64 24 | tr -d '\n')"
  platform_secret="$(openssl rand -hex 32)"
  cat >"$ENV_FILE" <<ENVIRONMENT
CLIENT_SLUG=autos
CLIENT_DOMAIN=$DOMAIN
PROXY_NETWORK=deploy_cardgame_network
APP_PORT=4101
POSTGRES_PORT=55101
POSTGRES_DB=autosuite
POSTGRES_USER=autosuite
POSTGRES_PASSWORD=$database_password
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=$dashboard_password
DASHBOARD_SESSION_SECRET=$dashboard_secret
PLATFORM_ADMIN_USER=admin-geral
PLATFORM_ADMIN_PASSWORD=$platform_password
PLATFORM_ADMIN_SESSION_SECRET=$platform_secret
HOST=0.0.0.0
PORT=3000
ENVIRONMENT
  chmod 600 "$ENV_FILE"
  printf '%s\n' "$dashboard_password" >"/root/autos-dashboard-password.txt"
  printf '%s\n' "$platform_password" >"/root/autos-platform-password.txt"
  chmod 600 /root/autos-dashboard-password.txt /root/autos-platform-password.txt
fi

cd "$INSTALL_DIR"
docker compose -p concessionaria_autos --env-file "$ENV_FILE" up -d --build

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:4101/api/branding >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    docker compose -p concessionaria_autos --env-file "$ENV_FILE" logs --tail=120 app
    echo "A aplicacao nao ficou saudavel; o Nginx nao foi recarregado." >&2
    exit 1
  fi
  sleep 2
done

docker compose -p concessionaria_autos --env-file "$ENV_FILE" exec -T \
  -e PLATFORM_DEMO_DOMAIN="$DOMAIN" app npm run platform:seed

cat >"$NGINX_FILE" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name autos.3esysten.com.br;

    client_max_body_size 20m;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/events {
        proxy_pass http://concessionaria_autos_app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
    }

    location / {
        proxy_pass http://concessionaria_autos_app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

docker exec cardgamestore_nginx nginx -t
docker exec cardgamestore_nginx nginx -s reload

echo
echo "Deploy concluido: https://$DOMAIN"
echo "Senha do painel da concessionaria: /root/autos-dashboard-password.txt"
echo "Senha da central 3esysten: /root/autos-platform-password.txt"
docker compose -p concessionaria_autos --env-file "$ENV_FILE" ps
