---
name: datalegal-saas-design
description: Project-specific design guidance for DataLegal frontend work. Use when improving, auditing, or planning UI/CSS for the DataLegal React/Tailwind SaaS compliance app, especially when changes must preserve functionality, routes, permissions, API behavior, forms, and business logic.
---

# DataLegal SaaS Design

## Core Product Frame

Treat DataLegal as an operational SaaS workspace for LOPDP compliance, not as a landing page or marketing site. Design for DPOs, admins, auditors and department heads who need to scan status, manage evidence, complete forms, review tables and export reports.

Keep DataLegal distinct from DataConSentido. DataConSentido can inform visual tone and color references, but do not rebrand the product interface unless explicitly requested.

## Non-Negotiable Constraints

- Preserve functionality, routes, API contracts, permissions, validation rules and data flow.
- Do not change backend behavior, models, schemas, migrations or endpoint shapes for visual work.
- Do not change form submit behavior, field names, required fields or role visibility.
- Prefer component-level styling and tokens over one-off page hacks.
- Keep changes reviewable in small layers: tokens, shared components, shell, then page-level polish.

## Visual Direction

- Use a restrained enterprise SaaS style: clear hierarchy, compact spacing, readable tables and predictable controls.
- Prefer light workspace surfaces for productivity. Use navy/teal as controlled brand accents, not full-page decoration.
- Use semantic status colors consistently: green for success/complete, amber for warning/pending, red for critical/danger, blue/teal for info.
- Avoid oversized heroes, decorative blobs, heavy gradients, nested cards and marketing-style sections inside authenticated app pages.
- Make dashboards useful at a glance: strong KPI labels, consistent number formatting, clear empty/error/loading states and obvious exports/actions.

## Layout Rules

- Keep the sidebar stable, scannable and grouped by operational domain.
- Keep the topbar quiet and functional; use reliable icons or text, never corrupted characters.
- Keep tables dense but readable with clear headers, subtle row separators, truncation where needed and horizontal overflow only when unavoidable.
- Keep forms compact, with labels, hints and validation messages close to the fields they describe.
- Keep cards for actual grouped content, repeated entities, panels and modals. Do not put cards inside cards.

## Tailwind/CSS Guidance

- Start with `tailwind.config.js` tokens and `src/index.css` base/component utilities.
- Keep color changes centralized in tokens before touching many pages.
- Use existing shared components first: buttons, badges, inputs, cards, tables, page headers, tabs and states.
- Introduce a new shared component only when it removes repeated styling across multiple pages.
- Check responsive behavior on mobile and desktop before finalizing visual changes.

## Audit Workflow

When auditing the UI, inspect at least:

- `/login` for brand first impression and auth clarity.
- `/dashboard` for KPI hierarchy, cards, charts and quick actions.
- One table-heavy page such as users, tenants, treatment activities or audit log.
- One form/modal-heavy page such as tenants, users, risk assessments or treatment activities.
- Mobile width for sidebar, topbar, text wrapping and button fit.

For each issue, report:

- Screen or component.
- Problem.
- Why it matters for a compliance SaaS user.
- Recommended visual-only fix.
- Risk of changing functionality, if any.

## Validation

For implementation work, run frontend lint/typecheck and build when feasible. For documentation-only or audit-only work, verify `git diff` is limited to the intended docs or screenshots.
