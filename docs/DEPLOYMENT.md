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

### Endereço padrão e domínio próprio

Defina `PLATFORM_BASE_DOMAIN=3esysten.com.br` no ambiente da central. Ao
cadastrar a concessionária `loja-centro`, o painel reserva automaticamente
`loja-centro.3esysten.com.br`. Um registro DNS curinga (`*.3esysten.com.br`)
apontando para o proxy evita criar um registro novo para cada cliente.

Se a concessionária usar um domínio próprio, mantenha o subdomínio 3esysten
como endereço de reserva e cadastre o domínio do cliente no painel. O estado
`Aguardando DNS` indica que o cliente ainda precisa apontar o domínio para o
proxy; marque como `Ativo` somente depois de validar DNS e HTTPS.

O painel registra o estado e os dados operacionais, mas não armazena tokens da
Cloudflare nem altera DNS automaticamente. Essa automação deve usar credenciais
restritas mantidas no VPS quando for adicionada.

### Criar uma nova concessionária

Depois de cadastrar o cliente e reservar as portas no painel geral, execute no
VPS o comando gerado em **Instalações**. O provisionador cria senhas aleatórias,
um banco e volume exclusivos, a configuração do Nginx e a instalação Docker:

```sh
bash deploy/provision-client.sh moto-centro 4102 55102
```

Com domínio próprio:

```sh
bash deploy/provision-client.sh moto-centro 4102 55102 estoque.motocentro.com.br
```

O endereço `moto-centro.3esysten.com.br` continua configurado como reserva. O
script não compra domínio nem altera a Cloudflare. Antes de executá-lo, confirme
que o DNS curinga da plataforma aponta para o VPS; para domínio próprio, o
cliente deve apontar o host para o mesmo proxy.

## Atualização

```sh
bash /opt/concessionarias/moto-centro/deploy/update-client.sh moto-centro
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
