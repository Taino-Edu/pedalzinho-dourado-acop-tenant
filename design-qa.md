# Design QA — vitrine pública e painel interno

- Source visual truth:
  - `C:\Users\TI06\.codex\generated_images\019ffba7-5bb3-7381-bf80-93d28a3e83b5\exec-115adba0-bfa7-4cea-a896-2ff46cfae786.png`
  - `C:\Users\TI06\.codex\generated_images\019ffba7-5bb3-7381-bf80-93d28a3e83b5\exec-b75f6f0f-eee3-405a-a572-d683a46f3866.png`
- Implementation screenshots:
  - `docs/design-qa/home-desktop-1440x1024-v2.png`
  - `docs/design-qa/dashboard-desktop-1440x1024-v4.png`
- Viewport: desktop 1440 × 1024 CSS px, browser screenshot at 1× density.
- State: public catalog loaded with 3 PostgreSQL vehicles; authenticated dashboard loaded with 3 leads, 3 vehicles and appointments.

## Full-view comparison evidence

The public composition preserves the selected direction: dark premium navigation, cinematic SUV hero with left-aligned Portuguese headline, overlaid four-part vehicle finder, and inventory entering immediately below. The internal screen preserves the selected combined direction: ink sidebar, warm light workspace, KPI strip, horizontal pipeline, right activity drawer, inventory table and collapsible modules.

## Focused comparison evidence

- Header/hero: navigation, hierarchy, hero asset crop and search proportions were compared against the public reference. The first iteration exposed stacked desktop navigation and a low-quality parking-lot photo; both were replaced in the second capture.
- Dashboard data region: KPI density, pipeline columns, sidebar width and right drawer were compared against the internal reference. The first iteration exposed an authenticated API bootstrap failure; the final capture renders database data without exposing credentials in JavaScript.
- Responsive structure was inspected through CSS breakpoints and horizontal-overflow assertions. The browser viewport-control backend did not apply the requested 390 px override reliably, so exact pixel-level mobile screenshot comparison remains a P3 follow-up rather than a blocking layout issue.

## Required fidelity surfaces

- Fonts and typography: Manrope for product/display hierarchy and IBM Plex Sans for operational UI match the clean automotive/SaaS direction. Sizes, weights and wrapping preserve the source hierarchy.
- Spacing and layout rhythm: public hero/search overlap and dashboard 4-column pipeline/right drawer match the reference proportions. No desktop horizontal document overflow.
- Colors and visual tokens: deep ink/navy, electric blue actions, orange priority accent, off-white admin canvas and green WhatsApp states map directly to the selected visuals.
- Image quality and assets: a dedicated high-resolution cinematic hero was generated and used; vehicle cards use real inventory photography; Material Symbols supplies standard UI icons. No placeholder or code-drawn hero asset remains.
- Copy and content: primary public and dashboard experiences are in Portuguese with Brazilian currency and dates. Seed customer names/phones remain demo data from the inherited database and can be localized in a later content pass.

## Comparison history

1. P1 — desktop public navigation stacked vertically. Fixed by overriding inherited mobile flex direction for the selected desktop layout. Post-fix evidence: `home-desktop-1440x1024-v2.png`.
2. P1 — hero photography lacked the premium commercial art direction. Fixed with generated 16:9 automotive hero asset. Post-fix evidence: `home-desktop-1440x1024-v2.png`.
3. P1 — internal dashboard did not hydrate protected API data after Basic Auth navigation. Fixed by adding an HttpOnly session upgrade and server-rendered authenticated bootstrap payload. Post-fix evidence: `dashboard-desktop-1440x1024-v4.png`.
4. P2 — overlaid finder was visually clipped by the hero overflow boundary. Fixed by allowing visible overflow and establishing explicit stacking contexts.

## Primary interactions tested

- Public catalog loads 3 vehicles with no broken images.
- Public page has no replacement characters and no console errors.
- Dashboard renders 4 pipeline columns, 3 lead cards and 3 inventory rows.
- Dashboard document has no horizontal overflow at desktop.
- Module collapse, sidebar collapse, module order persistence, search shortcut, vehicle filters, lead drag/drop and WhatsApp links are implemented.
- Automated suite: 33 tests passed.

## Remaining P3 polish

- Run a manual device-matrix pass in real Chrome/Safari before production launch.
- Translate inherited secondary pages and replace demo Nigerian phone numbers/names in seed data.

final result: passed
