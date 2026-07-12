# Purpose
- Owns shared server-side logic for auth, SQLite persistence, environment validation, YAML generation, rate limiting, security helpers, and VLESS parsing.

# Ownership
- `db.ts` owns schema initialization, users, user-owned subscription-configuration isolation, and persistence helpers.
- `generator.ts` owns transformation from app state plus templates into Clash/Mihomo YAML.
- `auth.ts`, `security.ts`, and `rate-limit.ts` own request/session protections.
- `env.ts` owns runtime defaults and production secret enforcement.

# Local Contracts
- Keep generated config behavior stable unless the task explicitly changes subscription output.
- Do not weaken production secret validation, timing-safe comparisons, origin checks, or cookie protections.
- Database schema changes must be backward-compatible with existing `data/app.db` unless a migration is requested.
- Subscription configuration data is scoped by both configuration ID and owning user; preserve the legacy default configuration and its `SUB_TOKEN` URL during migrations.
- User passwords use salted scrypt hashes; sessions must reference an enabled user and may not grant administrator access by default.
- Legacy single-config migration must first create `app.db.pre-multi-config.bak`; legacy single-user migration must first create `app.db.pre-users.bak`. Apply each detected schema/data migration in one SQLite transaction.

# Work Guidance
- Keep helpers small, typed, and server-compatible.
- Use existing `js-yaml` dependency for YAML work.

# Verification
- Run `npm run build` after TypeScript logic changes.

# Child DOX Index
- No child AGENTS.md files currently.
