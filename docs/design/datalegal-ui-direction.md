# DataLegal UI Direction

## Product Position

DataLegal is an operational compliance SaaS for LOPDP work. The interface should feel calm, precise and trustworthy: less landing-page energy, more admin workspace clarity.

## Visual Tokens

Use these values as the first implementation target:

| Token | Value | Use |
| --- | --- | --- |
| Brand navy | `#0b1220` | Primary text, brand mark, strong navigation |
| Brand teal | `#0891b2` | Primary actions, focus, active states |
| Brand cyan | `#06b6d4` | Secondary accent and subtle highlights |
| Surface | `#ffffff` | Cards, modals, inputs |
| App background | `#f7fafc` | Main workspace background |
| Border | `#d9e2ec` | Tables, cards, inputs |
| Muted text | `#526173` | Descriptions and metadata |
| Success | `#059669` | Active, complete, low risk |
| Warning | `#d97706` | Pending, review, medium risk |
| Danger | `#dc2626` | Critical, failed, destructive |

## Component Rules

- Keep cards and panels at small radius with clear borders.
- Use teal/navy for brand and interaction states, not purple.
- Keep tables dense and readable with stronger headers.
- Use reliable icons or text fallbacks; avoid corrupted glyphs.
- Keep login more branded than internal pages, but still compact and operational.

## Implementation Scope

The first visual pass may update shared UI styling, app shell styling, login presentation and global tokens. It must not change functionality, routes, forms, API calls, permissions or data contracts.
