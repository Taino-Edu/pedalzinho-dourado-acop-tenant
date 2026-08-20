#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="${REPOSITORY_URL:-https://github.com/Taino-Edu/pedalzinho-dourado-acop-tenant.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-codex/pedalzinho-dourado-acop-tenant}"
PLATFORM_BASE_DOMAIN="${PLATFORM_BASE_DOMAIN:-3esysten.com.br}"
PROXY_NETWORK="${PROXY_NETWORK:-deploy_cardgame_network}"
NGINX_DIR="${NGINX_DIR:-/opt/tenant-erp/deploy/nginx}"
NGINX_CONTAINER="${NGINX_CONTAINER:-cardgamestore_nginx}"

usage() {
  echo "Uso: $0 <slug> <porta-app> <porta-postgres> [dominio-proprio]"
  echo "Exemplo: $0 moto-centro 4102 55102 estoque.motocentro.com.br"
}

[[ $# -ge 3 && $# -le 4 ]] || { usage; exit 1; }

slug="$1"
app_port="$2"
postgres_port="$3"
custom_domain="${4:-}"
platform_domain="${slug}.${PLATFORM_BASE_DOMAIN}"
active_domain="${custom_domain:-$platform_domain}"
install_dir="/opt/concessionarias/${slug}"
env_file="${install_dir}/deploy/clientes/${slug}.env"
nginx_file="${NGINX_DIR}/autosuite-${slug}.conf"
project="concessionaria_${slug}"

[[ "$(id -u)" -eq 0 ]] || { echo "Execute como root." >&2; exit 1; }
[[ "$slug" =~ ^[a-z0-9]+([_-][a-z0-9]+)*$ ]] || { echo "Slug invalido." >&2; exit 1; }
[[ "$app_port" =~ ^[0-9]+$ && "$postgres_port" =~ ^[0-9]+$ ]] || { echo "As portas precisam ser numericas." >&2; exit 1; }
[[ "$platform_domain" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]] || { echo "Dominio da plataforma invalido." >&2; exit 1; }
if [[ -n "$custom_domain" && ! "$custom_domain" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]]; then
  echo "Dominio proprio invalido. Informe apenas o host, sem https:// ou caminho." >&2
  exit 1
fi

for command_name in git docker openssl curl; do
  command -v "$command_name" >/dev/null || { echo "Comando ausente: $command_name" >&2; exit 1; }
done

docker network inspect "$PROXY_NETWORK" >/dev/null 2>&1 || {
  echo "A rede Docker $PROXY_NETWORK nao existe; nenhuma alteracao foi feita." >&2
  exit 1
}

if command -v ss >/dev/null; then
  ss -lntH | awk '{print $4}' | grep -Eq "[:.]${app_port}$" && { echo "A porta $app_port ja esta em uso." >&2; exit 1; }
  ss -lntH | awk '{print $4}' | grep -Eq "[:.]${postgres_port}$" && { echo "A porta $postgres_port ja esta em uso." >&2; exit 1; }
fi

mkdir -p "$(dirname "$install_dir")"
if [[ -d "$install_dir/.git" ]]; then
  git -C "$install_dir" fetch origin "$DEPLOY_BRANCH"
  git -C "$install_dir" checkout "$DEPLOY_BRANCH"
  git -C "$install_dir" pull --ff-only origin "$DEPLOY_BRANCH"
else
  git clone --branch "$DEPLOY_BRANCH" --single-branch "$REPOSITORY_URL" "$install_dir"
fi

mkdir -p "$(dirname "$env_file")" "$NGINX_DIR"
if [[ ! -f "$env_file" ]]; then
  database_password="$(openssl rand -hex 24)"
  dashboard_password="$(openssl rand -base64 24 | tr -d '\n')"
  dashboard_secret="$(openssl rand -hex 32)"
  platform_password="$(openssl rand -base64 24 | tr -d '\n')"
  platform_secret="$(openssl rand -hex 32)"
  cat >"$env_file" <<ENVIRONMENT
CLIENT_SLUG=$slug
CLIENT_DOMAIN=$active_domain
PLATFORM_BASE_DOMAIN=$PLATFORM_BASE_DOMAIN
PROXY_NETWORK=$PROXY_NETWORK
SHOWCASE_MODE=false
APP_PORT=$app_port
POSTGRES_PORT=$postgres_port
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
  chmod 600 "$env_file"
  printf '%s\n' "$dashboard_password" >"/root/${slug}-dashboard-password.txt"
  chmod 600 "/root/${slug}-dashboard-password.txt"
fi

cd "$install_dir"
docker compose -p "$project" --env-file "$env_file" up -d --build

for attempt in $(seq 1 45); do
  if curl --fail --silent --show-error "http://127.0.0.1:${app_port}/api/branding" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 45 ]]; then
    docker compose -p "$project" --env-file "$env_file" logs --tail=160 app
    echo "A aplicacao nao ficou saudavel; o proxy nao foi alterado." >&2
    exit 1
  fi
  sleep 2
done

server_names="$platform_domain"
[[ -n "$custom_domain" ]] && server_names="$server_names $custom_domain"
cat >"$nginx_file" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $server_names;

    client_max_body_size 20m;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/events {
        proxy_pass http://concessionaria_${slug}_app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }

    location / {
        proxy_pass http://concessionaria_${slug}_app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINX

docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload

echo
echo "Instalacao concluida: https://$active_domain"
echo "Endereco de reserva: https://$platform_domain"
echo "Painel: https://$active_domain/pages/dashboard.html"
echo "Senha do painel: /root/${slug}-dashboard-password.txt"
echo "Ambiente protegido: $env_file"
docker compose -p "$project" --env-file "$env_file" ps
