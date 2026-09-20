# Purpose
- Owns shared server-side logic for auth, SQLite persistence, environment validation, YAML generation, rate limiting, security helpers, node parsing, and upstream subscriptions.

# Ownership
- `db.ts` owns schema initialization, users, user-owned subscription-configuration isolation, and persistence helpers.
- `generator.ts` owns transformation from app state plus templates into Clash/Mihomo YAML.
- `auth.ts`, `security.ts`, and `rate-limit.ts` own request/session protections.
- `env.ts` owns runtime defaults and production secret enforcement.
- `node-uri.ts` and `vless.ts` parse VLESS / Hysteria2 links and plain or Base64 subscription bodies; unsupported upstream entries fail the import instead of silently dropping nodes.
- `subscription-fetch.ts` owns bounded HTTP(S) downloads, validated public addresses, DNS-pinned connections, redirect checks, and TLS verification.
- `subscriptions.ts` owns configuration-scoped source snapshots, transactional refresh, source removal, and normalized upstream userinfo.

# Local Contracts
- Keep generated config behavior stable unless the task explicitly changes subscription output.
- Do not weaken production secret validation, timing-safe comparisons, origin checks, or cookie protections.
- Database schema changes must be backward-compatible with existing `data/app.db` unless a migration is requested.
- Subscription configuration data is scoped by both configuration ID and owning user; preserve the legacy default configuration and its `SUB_TOKEN` URL during migrations.
- User passwords use salted scrypt hashes; sessions must reference an enabled user and may not grant administrator access by default.
- Legacy single-config migration must first create `app.db.pre-multi-config.bak`; legacy single-user migration must first create `app.db.pre-users.bak`. Apply each detected schema/data migration in one SQLite transaction.
- Source migration adds `subscription_sources` and nullable `nodes.source_id` within schema initialization; existing manual nodes remain unowned by sources.
- Schema initialization takes an immediate SQLite write transaction so concurrent route/build workers serialize migrations; set the busy timeout before requesting WAL mode.
- Refresh only the selected source, retain unchanged node IDs/enabled states/order, preserve manual nodes, and keep old data if fetching or parsing fails. Refresh is explicit, not triggered by public subscription downloads.
- Emit upstream `subscription-userinfo` only for a configuration with exactly one source; omit unavailable fields and never invent quotas or aggregate distinct plans. Public responses use the last successful snapshot.
- Upstream URLs and node credentials are secrets: never log them or embed real values in tests/docs. Fetches allow at most 3 redirects, 15 seconds, and 2 MiB.

# Work Guidance
- Keep helpers small, typed, and server-compatible.
- Use existing `js-yaml` dependency for YAML work.

# Verification
- Run `npm run build` after TypeScript logic changes.
- Run `npm test` for parser, fetch restrictions, refresh/rollback/isolation, YAML output, and subscription-header coverage with synthetic data and temporary SQLite state.

# Child DOX Index
- No child AGENTS.md files currently.
