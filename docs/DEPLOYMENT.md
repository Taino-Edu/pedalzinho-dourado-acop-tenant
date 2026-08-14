# Implantação com Docker e domínios

## Uma instalação por cliente

O caminho mais simples para as primeiras vendas é manter uma pasta, um projeto
Docker e um volume PostgreSQL por concessionária. Isso isola dados e permite
personalizar ou atualizar cada cliente sem transformar a aplicação em
multi-tenant antes da hora.

1. Copie `.env.example` para `.env`.
2. Troque `POSTGRES_PASSWORD` e `DASHBOARD_PASSWORD` por senhas fortes e únicas.
3. Copie `deploy/cliente.env.example` e escolha portas diferentes para cada cliente com `APP_PORT` e `POSTGRES_PORT`.
4. Inicie a stack com um nome de projeto único:

```sh
docker compose -p cliente_slug --env-file .env up -d --build
docker compose -p cliente_slug ps
```

O atalho `deploy/deploy-client.sh` valida o slug, aplica o padrão
`concessionaria_<slug>` e mostra a saúde dos containers ao final.

O painel geral fica em `/pages/superadmin.html`, protegido por credenciais
`PLATFORM_ADMIN_*` diferentes das credenciais de cada concessionaria. Rode
`npm run platform:seed` somente no banco escolhido como central de controle;
ele cria o catalogo inicial de servicos, sem armazenar segredos de deploy.

O PostgreSQL é publicado somente em `127.0.0.1`, portanto não fica acessível
pela internet. A porta da aplicação deve ser acessada externamente apenas pelo
reverse proxy.

## DNS e HTTPS

O DNS fica na Cloudflare, que encerra o HTTPS e entrega HTTP na porta 80 do
container `cardgamestore_nginx`. O Nginx e os apps compartilham a rede Docker
externa `deploy_cardgame_network`; cada app usa um alias exclusivo no formato
`concessionaria_<slug>_app`. Use `deploy/nginx-client.conf.example` como base.

Valide sempre com `nginx -t` antes de recarregar. Não publique URLs como
`dominio:4101`: as portas auxiliares ficam vinculadas a `127.0.0.1`, sem novas
regras públicas no firewall. O PostgreSQL nunca entra na rede do proxy.

## Atualização

```sh
bash /opt/concessionarias/autos/deploy/update.sh
```

O script baixa a branch configurada, reconstrói apenas a stack da concessionária,
verifica a saúde da aplicação e valida o Nginx antes de recarregá-lo. As
migrações Prisma são aplicadas automaticamente na inicialização. O seed só
é executado quando ainda não existe nenhuma concessionária no banco.

## Backup PostgreSQL

```sh
docker compose -p cliente_slug exec -T db pg_dump -U autosuite autosuite > cliente_slug.sql
```

Guarde backups fora do servidor e teste a restauração periodicamente.

## Personalização pelo cliente

Depois de entrar em `/pages/settings.html`, a concessionária pode configurar
nome, slogan, logotipo por URL, cores, WhatsApp e Instagram. A vitrine consulta
somente `/api/branding`, que não expõe configurações administrativas.
