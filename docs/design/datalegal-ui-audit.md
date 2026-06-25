# DataLegal UI Audit

## Summary

This audit uses the project-specific `datalegal-saas-design` skill and real screenshots from the local Docker stack. The goal is to identify visual improvement opportunities without changing functionality.

Screenshots reviewed:

- `docs/design/screenshots/01-login-desktop.png`
- `docs/design/screenshots/02-dashboard-desktop.png`
- `docs/design/screenshots/03-users-table-desktop.png`
- `docs/design/screenshots/04-tenants-form-desktop.png`
- `docs/design/screenshots/05-dashboard-mobile.png`

## Key Findings

### 1. Brand Signal Is Too Generic

The current UI uses a generic `DL` gradient mark and indigo/purple primary colors. It reads as a clean SaaS template, but not yet as a privacy/compliance product with a distinct identity.

Recommended visual-only fix:

- Define DataLegal product tokens using navy, teal, slate and semantic colors.
- Keep DataLegal as the product name.
- Use DataConSentido colors only as controlled inspiration, not as a rebrand.
- Replace the generic `DL` mark later with an approved DataLegal/product mark or a more compliance-oriented symbol.

### 2. Login Screen Is Clean But Under-Branded

The login page is readable and functional, but it has too much empty white space and little trust/context. For a compliance platform, the first screen should communicate security and operational seriousness without becoming a marketing landing page.

Recommended visual-only fix:

- Add a restrained brand panel or header treatment with navy/teal accents.
- Keep the form compact and centered.
- Add subtle product context around LOPDP workspace, tenant access and secure compliance operations.
- Avoid large hero copy or promotional sections.

### 3. App Shell Is Functional But Visually Flat

The sidebar is useful and well grouped, but lacks stronger hierarchy. The active state uses a pale lavender treatment that does not match the intended compliance brand direction. The topbar is quiet, but icon rendering depends on loose characters/emoji.

Recommended visual-only fix:

- Strengthen sidebar groups with clearer section rhythm and a more product-specific active state.
- Move active navigation toward navy/teal tokens instead of purple.
- Replace topbar symbols with reliable icon components in a later implementation.
- Keep the search, alerts and user menu behavior unchanged.

### 4. Dashboard Has Good Structure But Weak Compliance Semantics

The dashboard layout is solid: KPIs, trends, alerts and quick actions are in the right places. The current card style is soft and generic, and the empty chart state looks visually underpowered.

Recommended visual-only fix:

- Reduce the glass/card softness and use flatter enterprise surfaces.
- Add subtle status indicators to KPI cards without changing KPI values.
- Improve empty/zero-data chart treatment so it reads as an intentional state.
- Keep exports and quick actions in their current functional positions.

### 5. Tables Are Readable But Too Sparse

The users and tenants table screens are clean, but the visual system leaves large empty areas. Table headers, row rhythm and actions can feel more like an admin tool.

Recommended visual-only fix:

- Increase table density slightly.
- Improve header contrast and row hover/focus states.
- Keep action buttons compact and consistent.
- Preserve existing columns, actions and data loading behavior.

### 6. Modal/Form Styling Needs Less Visual Noise

The tenant modal has good field grouping and readable labels. However, the thick purple outline and heavy page blur make it feel more decorative than operational.

Recommended visual-only fix:

- Use a cleaner modal border/shadow based on neutral and brand tokens.
- Reduce background blur intensity.
- Keep field layout, required markers, labels and validation behavior unchanged.
- Align primary/secondary buttons with the future DataLegal token system.

### 7. Mobile Layout Works But Needs Product Context

The mobile dashboard stacks cleanly and avoids overlap. The topbar becomes very minimal, showing only menu, alert and avatar controls, so the user loses product context.

Recommended visual-only fix:

- Add a compact brand cue or title context in mobile topbar if space allows.
- Keep export buttons accessible but consider tighter spacing.
- Ensure KPI cards maintain consistent padding and text wrapping on narrow widths.

## Recommended Implementation Order

1. Create final DataLegal design tokens in documentation before touching CSS.
2. Update Tailwind color tokens and global surfaces.
3. Restyle shared UI components: buttons, badges, inputs, cards, tables and modals.
4. Restyle app shell: sidebar, topbar and active navigation.
5. Restyle login and dashboard using the updated shared components.
6. Review table-heavy and form-heavy pages for consistency only.

## Guardrails

- Do not change routes, API calls, response handling, permissions or form submission logic.
- Do not rename modules or change data fields.
- Do not change dashboard calculations, table columns or modal validation.
- Treat all future work as CSS/component presentation changes unless explicitly approved.

## Capture Note

Authenticated screenshots required refreshing the local demo user's `last_activity_at` in the Docker database because the local session was expired. This changed only local container data and did not modify repository files.
