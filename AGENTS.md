# Purpose
- Self-hosted Clash/Mihomo subscription manager built with Next.js, TypeScript, SQLite, and YAML templates.
- Root owns project-wide operating rules, repository structure, and cross-cutting workflow contracts.

# Ownership
- Keep application source, templates, runtime data, deployment files, and durable docs understandable from this file plus the nearest child `AGENTS.md`.
- Do not commit or disclose real node links, subscription tokens, admin secrets, runtime databases, or generated logs.

# Local Contracts
- Read this root doc and every child `AGENTS.md` on the path before editing files.
- Keep changes surgical and directly tied to the requested task.
- Match existing TypeScript, Next.js App Router, YAML, and CSS style.
- Runtime files under `data/` are local state; avoid changing them unless the task explicitly targets persisted app data.

# Work Guidance
- Prefer simple server-side changes in `lib/` and route handlers over broad frontend rewrites.
- Keep generated Clash/Mihomo YAML deterministic and compatible with Clash Verge / Mihomo.
- When touching security-sensitive code, preserve no-store responses, origin checks, session cookie constraints, and production secret validation.
- Back up external app configuration before editing it.
- Keep runtime data, environment files, and build artifacts out of Docker build contexts via `.dockerignore`.

# Verification
- Run the most relevant existing check when code changes: `npm run build` for full Next.js validation, or targeted syntax/type checks when build is unnecessary.
- Validate YAML templates or generated YAML after modifying Clash/Mihomo configuration content.

# Child DOX Index
- `app/AGENTS.md` — Next.js App Router pages, API routes, public subscription/rule endpoints, and UI components.
- `lib/AGENTS.md` — shared authentication, database, environment, generation, rate-limit, security, and VLESS parsing logic.
- `templates/AGENTS.md` — base Mihomo subscription templates used by the generator.
- `data/AGENTS.md` — local SQLite runtime state and database sidecar files.
