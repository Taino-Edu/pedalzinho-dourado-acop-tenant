# Implantação com Docker e domínios

## Uma instalação por cliente

O caminho mais simples para as primeiras vendas é manter uma pasta, um projeto
Docker e um volume PostgreSQL por concessionária. Isso isola dados e permite
personalizar ou atualizar cada cliente sem transformar a aplicação em
multi-tenant antes da hora.

1. Copie `.env.example` para `.env`.
2. Troque `POSTGRES_PASSWORD` e `DASHBOARD_PASSWORD` por senhas fortes e únicas.
3. Escolha portas diferentes para cada cliente com `APP_PORT` e `POSTGRES_PORT`.
4. Inicie a stack com um nome de projeto único:

```sh
docker compose -p cliente_slug --env-file .env up -d --build
docker compose -p cliente_slug ps
```

O PostgreSQL é publicado somente em `127.0.0.1`, portanto não fica acessível
pela internet. A porta da aplicação deve ser acessada externamente apenas pelo
reverse proxy.

## DNS e HTTPS

O domínio aponta para o IP público do servidor por registro `A`/`AAAA`. Caddy
ou Nginx recebe as conexões nas portas 80/443 e encaminha pelo nome do domínio
para a porta interna de cada instalação. Exemplo de `Caddyfile`:

```caddy
cliente1.com.br, www.cliente1.com.br {
  reverse_proxy 127.0.0.1:4101
}

cliente2.com.br, www.cliente2.com.br {
  reverse_proxy 127.0.0.1:4102
}
```

Caddy provisiona e renova certificados TLS automaticamente. Não publique URLs
como `dominio:4101`; mantenha as portas das aplicações protegidas por firewall.

## Atualização

```sh
git pull
docker compose -p cliente_slug --env-file .env up -d --build
```

As migrações Prisma são aplicadas automaticamente na inicialização. O seed só
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
