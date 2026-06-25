# DataLegal Visual Research Report

## Summary

This report prepares a future frontend design pass without changing functionality. DataLegal and DataConSentido should remain distinct: DataLegal is the product interface, while DataConSentido is the consulting/client brand that can inform tone and color references.

No API routes, frontend routes, permissions, models, validation rules, form behavior or business logic should change as part of this design preparation.

## DataLegal Essence

DataLegal is a multi-tenant SaaS platform for LOPDP compliance in Ecuador. Its core purpose is operational execution, not marketing. The product supports DPOs, admins, auditors and department heads across the privacy compliance lifecycle:

- Authentication, MFA, RBAC and tenant isolation.
- Organization setup, users, departments and catalogs.
- Data inventory, treatment activities and information assets.
- Risk assessments, DPIA workflows and remediation plans.
- ARCO requests, portability, incidents and consents.
- Legal documents, ROPA, audit plans, audit log and reports.
- Backups, training and import/export workflows.

Design implication: the interface should feel like a reliable compliance workspace. It needs clear hierarchy, fast scanning, dense tables, compact forms, trustworthy states and strong status semantics.

## DataConSentido Essence

DataConSentido is a consulting/service brand around privacy, compliance and technology. The public site presents the company as a practical LOPDP partner focused on diagnosis, roadmap, RAT/RID, DPIA, policies, contracts, controls, training and DPO/DPD services.

Design implication: DataConSentido can contribute visual tone and credibility, but it should not replace the DataLegal product identity. Its palette can inspire controlled accents; its commercial landing-page layout should not be copied into an operational app.

## Similar Product Patterns

Comparable privacy, GRC and compliance products suggest these interface patterns:

- OneTrust groups privacy automation, consent, data governance, risk/compliance and third-party management. This supports grouping DataLegal by operational domains instead of marketing sections.
- DataGrail emphasizes data maps, request management, privacy assessments and risk registers. This validates prominent inventory, ARCO/request, assessment and risk surfaces.
- Vanta emphasizes compliance automation, audit preparation, evidence collection, risk registers, heatmaps, reporting and remediation workflows. This validates KPI dashboards, owner/status fields, risk scores, evidence states and downloadable reports.

For CSS and UI direction, DataLegal should follow enterprise SaaS conventions: restrained color, visible structure, accessible contrast, dense information layout and consistent component states.

## Design Recommendations

- Keep the main workspace light for productivity, with dark/navy reserved for brand accents or login framing.
- Reduce the generic indigo/sky look and move toward a more compliance-oriented palette using navy, teal, neutral slate and semantic risk colors.
- Keep the sidebar stable and scannable; active states should be obvious without heavy decoration.
- Keep topbar controls functional and quiet; replace corrupted icon characters with reliable icon components or safe text/icons in a later implementation.
- Use cards only for grouped content, KPI summaries and panels; avoid nested card-heavy layouts.
- Tables should prioritize readability: clear headers, subtle row dividers, compact density and consistent empty/error/loading states.
- Badges should remain semantic: success, warning, danger, info and neutral should carry workflow meaning.
- Forms and modals should stay compact and predictable, with clear labels, hints and validation messages.
- Avoid landing-page patterns inside the product: oversized hero sections, promotional gradients, decorative blobs and copy-heavy panels.

## Proposed Documentation Artifacts

Created alongside this report:

- `docs/design/dataconsentido-colors.md`: DataConSentido color reference and recommended DataLegal usage.

Recommended future artifact before CSS implementation:

- `docs/design/datalegal-ui-direction.md`: final DataLegal design tokens, component usage rules and page-level examples.

## Implementation Guardrails

Future frontend styling work should be visual-only unless explicitly approved otherwise.

- Do not change backend or frontend functionality.
- Do not change public API contracts, response shapes or models.
- Do not change routes, permissions or role visibility.
- Do not change form validation, submit behavior or data flow.
- Do not rename modules or alter i18n meaning beyond small visual copy fixes explicitly requested.
- Validate changes with frontend typecheck/lint and visual review.

## Sources

- DataLegal repository README and frontend navigation structure.
- DataConSentido public website: https://www.dataconsentido.com/
- OneTrust product positioning: https://www.onetrust.com/products/
- DataGrail platform positioning: https://www.datagrail.io/platform/
- Vanta risk/compliance product positioning: https://www.vanta.com/products/risk
