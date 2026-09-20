# Purpose
- Owns Next.js App Router surfaces: pages, API endpoints, subscription/rule output routes, and UI components.

# Ownership
- `app/api/` owns authenticated admin JSON APIs, including subscription-configuration lifecycle APIs.
- `app/rules/` and `app/sub/` own token-protected, configuration-scoped Clash/Mihomo output endpoints.
- `app/ui/` owns React client/admin interface components.

# Local Contracts
- Preserve authentication checks for admin APIs and token checks for public subscription/rule endpoints.
- Keep route responses no-store where existing helpers already enforce it.
- Keep UI changes focused on management workflows for nodes, rules, settings, login, and preview.

# Work Guidance
- Match existing App Router route handler patterns.
- Prefer shared validation/security helpers from `lib/` instead of duplicating logic in routes.
- Keep nodes, rules, settings, previews, and generated URLs scoped to the selected subscription configuration.
- Batch node imports must create unique names within the selected subscription configuration.
- `/api/nodes` accepts direct VLESS/Hysteria2 links or one HTTP(S) subscription URL; `/api/sources` updates/removes sources only after validating the owning user and configuration.
- Dashboard source cards show quota/expiry snapshots and explicit update/delete controls. Reimporting the same source URL updates it; deleting a source removes its imported nodes.
- `/sub/[token]` emits cached upstream userinfo for a single-source configuration and omits fake/default quotas; mixed-source configurations display individual plans in the dashboard only.

# Verification
- Run `npm run build` after route or UI behavior changes when practical.

# Child DOX Index
- No child AGENTS.md files currently.
