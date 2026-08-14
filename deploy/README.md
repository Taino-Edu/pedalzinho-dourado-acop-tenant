# Implantação isolada por concessionária

Cada cliente recebe:

- um projeto Docker Compose próprio;
- um container da aplicação;
- um container PostgreSQL;
- volume, rede, senhas e portas exclusivos;
- domínio encaminhado pelo proxy reverso do servidor.

O ambiente confirmado no servidor é:

- projeto existente: `/opt/tenant-erp/deploy/docker-compose.prod.yml`;
- Nginx em container: `cardgamestore_nginx`;
- diretório de configuração: `/opt/tenant-erp/deploy/nginx`;
- rede externa do proxy: `deploy_cardgame_network`;
- HTTPS encerrado pela Cloudflare; origem atendendo HTTP na porta 80.

## Criar um cliente

```sh
cp deploy/cliente.env.example deploy/clientes/cliente1.env
# Edite domínio, portas e todas as senhas.
chmod 600 deploy/clientes/cliente1.env
chmod +x deploy/deploy-client.sh deploy/backup-client.sh
./deploy/deploy-client.sh cliente1 deploy/clientes/cliente1.env
```

O nome do projeto será `concessionaria_cliente1`. O Docker prefixa rede e volume
com esse nome, impedindo que o PostgreSQL de um cliente seja reutilizado por
outro acidentalmente.

## Nginx e proxy reverso

O servidor compartilhado usa Nginx em Docker. O container `app` de cada cliente
participa simultaneamente da rede privada da sua stack e da rede externa
`deploy_cardgame_network`. O PostgreSQL participa somente da rede privada.

Copie `nginx-client.conf.example` para
`/opt/tenant-erp/deploy/nginx/autosuite-<slug>.conf`, troque domínio e o upstream
`concessionaria_<slug>_app`, valide e recarregue dentro do Compose existente:

```sh
docker exec cardgamestore_nginx nginx -t
docker exec cardgamestore_nginx nginx -s reload
```

A rota `/api/events` tem configuração própria porque mantém uma conexão SSE
aberta para atualizar CRM, agenda e estoque em tempo real. O buffering do Nginx
fica desativado somente nessa rota.

## Firewall

- no desenho atual, a Cloudflare entrega HTTPS e acessa a origem pela porta 80;
- restrinja a porta administrativa/SSH conforme a política atual do servidor;
- não crie regras públicas para `APP_PORT` ou `POSTGRES_PORT`;
- aplicação e PostgreSQL já estão vinculados a `127.0.0.1` no Compose.

Observação da auditoria: a regra atual `80/tcp ALLOW IN Anywhere` não restringe
a origem aos endereços da Cloudflare, apesar do comentário da regra. Corrigir
isso deve ser uma mudança separada, testada para não interromper o ERP atual.

Antes de ativar um novo cliente, confirme que a porta escolhida está livre e
que não conflita com nenhuma instalação do multi-tenant.

## Backup

```sh
./deploy/backup-client.sh cliente1 deploy/clientes/cliente1.env /srv/backups/concessionarias
```

Agende diariamente e envie uma cópia para fora do servidor. Um backup que
nunca foi restaurado em teste ainda não deve ser considerado confiável.
