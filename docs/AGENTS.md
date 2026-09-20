# Purpose
- Owns durable architecture decisions, implementation plans, deployment notes, and verification records.

# Ownership
- Keep plans current while work is active; record completed work, validation evidence, and unresolved risks.
- Do not include credentials, subscription tokens, node links, database contents, or server addresses.
- `deployment.md` owns the existing Compose deployment layout, backup/update/rollback procedure, and release verification; `upstream-subscriptions.md` owns upstream import behavior and verification.

# Local Contracts
- Plans must identify migration behavior for persisted data and the authorization boundary for user-facing data.
- A completed plan must state the checks that were run and any checks that could not run.

# Work Guidance
- Use concise, actionable Chinese documentation.
- Update progress in the same plan as implementation advances; do not create diary-style documents.

# Verification
- Match plan verification steps to existing repository commands and runtime checks.

# Child DOX Index
- No child AGENTS.md files currently.
