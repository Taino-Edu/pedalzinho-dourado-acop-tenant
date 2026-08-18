# Pedalzinho Dourado — ACOP Tenant

**One connected product.** Customers get a premium car-shopping experience. Dealers get the CRM, inventory, appointments, and analytics engine that runs the business behind it. When a visitor books a test drive on the storefront, the lead lands in the dealer's pipeline **in real time** — nothing is disconnected.

Projeto técnico do produto white-label para concessionárias. A marca exibida no site é configurável por cliente no painel.

## Edição comunitária e atribuição

Este repositório é a edição pública, open source e single-tenant do projeto. Ele pode ser usado, estudado, modificado e redistribuído nos termos da licença MIT incluída no repositório.

O trabalho começou a partir do projeto open source [AutoSuite, de eltsworkdesk](https://github.com/eltsworkdesk/autosuite). Mantemos essa atribuição e a licença original. Recursos empresariais específicos, integrações internas e a arquitetura multi-tenant da 3esysten são desenvolvidos separadamente para manter clara a fronteira entre a base comunitária e o produto comercial.

**New to this repo?** Read [`docs/ONBOARDING.md`](docs/ONBOARDING.md) first — it's the current, accurate orientation. Historical sprint/phase logs live in [`docs/archive/`](docs/archive/) if you're curious how we got here, but they're not current state.

![AutoSuite storefront homepage](docs/screenshots/home.png)

---

## Why this project exists

Most dealership software is a patchwork: a website from one vendor, a CRM from another, inventory in a spreadsheet, leads in an inbox. AutoSuite is built on a single thesis — **the storefront and the back office should be one system** — and this repo is the working proof:

```
 CUSTOMER SIDE                    DATA LAYER                DEALER SIDE
┌─────────────────────┐        ┌──────────────┐        ┌──────────────────────┐
│ Browse inventory    │        │              │        │ Dashboard (live KPIs)│
│ Financing calculator│  ───►  │  Serverless  │  ───►  │ CRM pipeline         │
│ Trade-in estimator  │        │  API +       │        │  New → Contacted →   │
│ Compare vehicles    │        │  Postgres    │        │  Qualified → Appt →  │
│ Book a test drive   │        │              │        │  Negotiating → Sold  │
│ Save favorites      │        │              │        │ Inventory management │
└─────────────────────┘        └──────────────┘        │ Appointments calendar│
                                                          │ Analytics + Staff    │
                                                          └──────────────────────┘
```

Try it yourself: book a test drive on any vehicle page — that's a real database row, visible on the dealer dashboard and CRM board seconds later via server-sent events (no polling, no refresh).

## Built to a deliverable standard

This is not a tutorial project. It's engineered the way client work ships:

- **Accessibility is a build gate.** Every push runs per-page axe-core audits plus HTML validation in CI, across all 18 pages — WCAG failures fail the build. Every color pairing in the design system is contrast-verified (AA minimum, most exceed 7:1).
- **A real design system.** OKLCH color tokens, spacing/type scales, and motion curves defined once in `css/style.css`/`css/dashboard.css` and consumed by every page — no one-off hex values, no drift between the storefront and the dealer-OS.
- **Real data end to end.** Both dashboards show actual Postgres rows. The financing calculator computes real amortization against each car's actual price. Nothing a dealer or reviewer touches is faked.
- **Deliberate architecture.** Hand-written HTML/CSS/JS for the storefront (fast and auditable) + Node APIs with Prisma/PostgreSQL. Docker Compose starts the app and its isolated database with the same schema used in production. In showcase mode (the default) the dealer-OS is served without any login so the demo can be shared by link; set `SHOWCASE_MODE=false` to put it back behind HTTP Basic Auth configured only through environment variables.
- **Real-time sync.** A single shared Server-Sent Events connection pushes lead/vehicle/appointment changes to every open dealer-OS tab — the CRM board, the dashboard KPIs, and the notification bell all update live, not on a timer.

## For dealers: the MVP today

| You get | Status |
|---|---|
| Branded storefront: search, filter, compare, favorites, vehicle pages | ✅ Live |
| Financing calculator + trade-in estimator on every listing | ✅ Live |
| Test-drive booking, no customer account needed | ✅ Live |
| Lead pipeline (Kanban + table), 7-stage status ladder, keyboard-accessible | ✅ Live |
| Round-robin lead auto-assignment on intake | ✅ Live |
| Inventory management: filters, bulk actions, quick edit, add vehicle | ✅ Live |
| Appointments: week calendar, scheduling, status tracking | ✅ Live |
| Analytics: sales funnel, inventory mix, lead sources | ✅ Live |
| Customers, Staff Activity, Settings (notifications, team, dealership profile) | ✅ Live |
| Self-service white-label: name, tagline, logo, colors, WhatsApp and Instagram | ✅ Live |
| Command palette (⌘K), live notification bell, mobile bottom nav | ✅ Live |
| Platform pitch: pricing tiers, testimonial, FAQ | ✅ Live |
| VIN decode auto-fill, photo upload | 🔜 Needs a 3rd-party VIN/storage API |
| Finance pre-qualification (soft credit pull) | 🔜 Needs a lending partner integration |
| Deal paperwork / e-signature | 🔜 Needs an e-sign provider |
| Role-based permissions (Owner/Manager/Sales/BDC) | 🔜 Roadmap — single shared login today |
| Territory/skill-based lead routing | 🔜 Round-robin is live; the other two strategies need a territory/skill model that doesn't exist yet |
| AI-assisted follow-up workflows | 🔜 Roadmap |

The MVP follows the product design brief in [`docs/design-handoff/`](docs/design-handoff/) — 15 design docs covering foundations, every screen, information architecture, user flows, success metrics, states, and the accessibility checklist this build is gated against. The "Needs a 3rd-party integration" items are deliberately out of scope for a self-contained demo — they'd require real vendor accounts (VIN decoders, credit bureaus, e-signature) rather than more app code.

## Screens

**Dealer OS — leads pipeline.** Every test-drive booking on the storefront lands here as a live lead, on a 7-stage Kanban board with KPIs computed from real data.

![Dealer dashboard with lead pipeline](docs/screenshots/dashboard.png)

**Storefront inventory.** Search, brand filter, price slider, sort, save-to-favorites, and side-by-side compare — all client-side against real listings.

![Inventory grid](docs/screenshots/inventory.png)

**Vehicle page — the buyer's tools.** Financing calculator (real amortization against the listing price) and trade-in estimator, plus specs and trim comparison.

![Vehicle detail page with financing calculator](docs/screenshots/vehicle-page.png)

**Platform pitch.** The dealer-facing marketing page positioning AutoSuite as one operating system.

![Platform marketing page](docs/screenshots/platform.png)

## Stack

`HTML/CSS/JS (storefront + dealer-OS)` · `Node.js` · `Prisma` · `PostgreSQL 16` · `Docker Compose` · `Server-Sent Events` · `Vitest`

```
├── index.html              Storefront homepage
├── pages/                  Storefront: cars, vehicle detail, compare, favorites,
│                           locations, financing calculator, trade-in estimator,
│                           platform pitch
│                           Dealer OS: dashboard, CRM, inventory, appointments,
│                           customers, analytics, staff activity, settings
├── css/                    Design tokens (style.css) + per-surface stylesheets
│                           (dashboard.css for the dealer-OS shell, home.css,
│                           cars.css, car.css, responsive.css, ...)
├── js/                     dos-shell.js (shared dealer-OS shell: SSE, command
│                           palette, notifications, modals, mobile nav),
│                           favorites.js, cars-data.js, compare.js, script.js
│   └── lib/                Pure logic (filtering/sorting, financing math) — no DOM,
│                           shared between the browser and tests/
├── tests/                  Vitest unit tests for js/lib/
├── api/                    Serverless functions: leads, vehicles, appointments
│                           (each merges its collection + by-id routes into one
│                           function via vercel.json rewrites), analytics,
│                           customers, team, dealership, finance, trade-ins,
│                           dashboard
├── prisma/                 PostgreSQL schema, migrations and seed scripts
├── compose.yaml            App + PostgreSQL development/production stack
├── Dockerfile              Node.js production image
├── docs/                   design-handoff/ (the 15-doc product design brief this
│                           was built from), design-system.md, ONBOARDING.md,
│                           archive/ (historical sprint/phase logs)
└── .github/workflows/      Accessibility + validation CI (18 pages gated)
```

## Showcase mode (no passwords)

This repository ships as the **modelo de exibição** — a demo anyone can open
from a link. `SHOWCASE_MODE` defaults to `true`, which means:

- every dealer-OS screen (`/pages/dashboard.html`, CRM, estoque, agenda,
  clientes, relatórios, atividade da equipe, configurações) opens with no login;
- the 3esysten platform console (`/pages/superadmin.html`) opens with no login;
- every `/api/*` route answers without credentials — **including writes**, so a
  visitor can create leads, edit inventory and move deals. That is deliberate
  for the demo; do not point a showcase instance at real customer data.

To lock it back down for a real dealership, set the flag off and supply
credentials:

```
SHOWCASE_MODE=false
DASHBOARD_USER=...
DASHBOARD_PASSWORD=...
PLATFORM_ADMIN_USER=...
PLATFORM_ADMIN_PASSWORD=...
```

With `SHOWCASE_MODE=false` the original HTTP Basic Auth behaviour returns
unchanged — the auth code was not removed, only short-circuited by the flag
(`api/_lib/showcase.js`).

## Development

PostgreSQL is required in every environment. Copy `.env.example` to `.env`,
replace both example passwords, then start the complete stack:

```
docker compose up -d --build
docker compose ps
```

For host-based development, start only `db`, set `DATABASE_URL` to PostgreSQL
on `127.0.0.1:55432`, then run `npm install`, `npm run db:deploy`, and
`npm run dev`. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for domains,
reverse proxy, separate client instances and backups.
