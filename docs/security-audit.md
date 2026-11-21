# Security audit

Audit date: 2026-11-20

Scope: browser application, Supabase schema and access controls, dependency tree, deployment headers, and repository automation. This is a source review, not a penetration test. The canonical migration must be applied to each deployed Supabase project before its controls are effective.

## Implemented controls

- **Database authorization:** RLS is enabled on all application tables and old policies are replaced by explicit owner/public policies (`supabase/migrations/20261121004505_initial_open_source_schema.sql:376`). Moderator session writes are owner-scoped (`:423`), public question reads are limited to moderated states (`:439`), moderator question updates are owner-scoped (`:469`), and feedback reads are owner-scoped (`:498`).
- **Least-privilege grants:** Data API table access is revoked and re-granted by role and column (`supabase/migrations/20261121004505_initial_open_source_schema.sql:509`). Vote rows receive no direct client grant.
- **Hardened database functions:** Security-definer functions use an empty `search_path`; `cast_vote` validates its identifier and verifies the session/question state before insertion (`supabase/migrations/20261121004505_initial_open_source_schema.sql:332`). Public execution is revoked before narrow grants are applied (`:373`).
- **Serialized public writes:** the hardening migration reconciles legacy vote counts, enforces vote/session consistency, and locks session state while anonymous questions and votes are validated (`supabase/migrations/20261121011503_harden_integrity_and_authorization.sql`). The composite relationship has a covering index for integrity checks and cascades (`supabase/migrations/20261121011657_index_vote_question_session.sql`).
- **Moderator provisioning:** the repository defaults to invitation-only signup, only invited Auth users are automatically assigned the moderator role, and database policies require that role for privileged writes. Direct signups default to the non-privileged audience role.
- **Safe exports:** CSV cells neutralize spreadsheet-formula prefixes before anonymous content is downloaded (`src/lib/csv.ts`).
- **Basic anonymous-write throttles:** private database buckets atomically limit questions and votes per browser identifier, cap question and feedback bursts per session, and retain only SHA-256 hashes of browser identifiers. Feedback is limited to one response per browser and session. Database constraints enforce all public text limits.
- **Duplicate vote constraint:** votes use a unique question/voter index and an atomic insert conflict path. The browser identifier is versioned and format-checked (`src/lib/voterStorage.ts:3`).
- **Redirect validation:** internal Auth redirects reject protocol-relative paths, backslashes, and control characters (`src/lib/navigation.ts:3`).
- **Browser credential boundary:** the Supabase client requires only browser-public configuration (`src/lib/supabase.ts:10`), and `.env.example` warns against service-role keys (`.env.example:1`).
- **Deployment headers:** the Vercel configuration includes CSP, clickjacking protection, MIME sniffing protection, a referrer policy, and a restrictive permissions policy (`vercel.json:2`).
- **Supply chain:** CI runs a moderate-or-higher npm audit. The local dependency audit completed with zero known vulnerabilities on the audit date.

## Residual risks and operator actions

### Anonymous abuse controls — medium

Question submission, voting, and feedback intentionally work without an account. Database limits now stop accidental loops and low-effort repeated writes, but a determined participant can clear browser storage, create new identifiers, or call the API directly. Database constraints preserve integrity but do not provide human identity, trustworthy IP throttling, or bot detection.

Operators must add rate limiting or bot protection at the hosting/database edge for public or high-profile events. The database RPCs validate and serialize writes but cannot reliably identify an IP address or human participant. Consider authenticated voting when vote integrity is a core requirement.

### Public session metadata — low

Sessions are publicly readable so a shared session URL works without authentication. Do not place confidential information in session names or descriptions. Treat session UUIDs as share links, not secrets.

### Hosted Auth configuration — configuration-dependent

Repository settings define safe local defaults, but hosted Supabase Auth settings are managed outside source control. Operators must configure exact production redirect URLs, production SMTP, an adequate password policy, and leaked-password protection where available. See `docs/deployment.md`.

### Security headers on non-Vercel hosts — configuration-dependent

`vercel.json` applies only on Vercel. Other hosts must reproduce its SPA fallback and response headers.

### Expected Supabase advisor warnings

If a hosted project keeps `graphql_public` exposed, the database advisor may report that public read models are discoverable through GraphQL; that exposure remains protected by RLS, though this project's local configuration disables the unused GraphQL schema. The advisor may also flag anonymous or authenticated execution of the security-definer `cast_vote`, `submit_question`, and `submit_feedback` functions. Those grants are intentional: all three functions use an empty search path, validate their inputs and session state, and are the supported anonymous write paths. `question_votes` intentionally has RLS with no policies because clients have no direct table privileges. Treat equivalent warnings for other tables or functions as regressions.

## Verification coverage

- Unit tests cover CSV formula neutralization, redirect/link sanitization, and voter-storage failure modes.
- pgTAP tests assert tables, RLS enablement, policy/function presence, hardened function search path, and indexes.
- GitHub Actions run lint, strict TypeScript, unit coverage, a production build, database reset/tests, Playwright smoke tests, dependency audit, and CodeQL.

Database tests require a Docker-compatible runtime and should be considered a release gate in CI even when Docker is unavailable on a contributor workstation.
