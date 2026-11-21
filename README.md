# Moderate Questions Panel

An Apache-2.0 web application for moderating audience questions during panels, conferences, and community events. Moderators create sessions, review incoming questions, publish selected questions, track audience votes, export results, and review post-session feedback. Participants join from a shared link without creating an account.

## Features

- Authenticated moderator accounts and owner-scoped session management
- Anonymous question submission with a moderated public feed
- One best-effort vote per browser-generated voter identifier
- Supabase Realtime updates with a low-frequency recovery poll
- QR-code session sharing and CSV exports
- Post-session ratings and comments
- Reproducible Supabase migrations, database tests, CI, and browser smoke tests

## Stack

- React 18, TypeScript, Vite 8, React Router 7, and TanStack Query
- Tailwind CSS and a small set of Radix UI primitives
- Supabase Postgres, Auth, Realtime, and Row Level Security
- Vitest, pgTAP, Playwright, ESLint, and GitHub Actions

## Quick start

### Prerequisites

- Node.js 22.12 or newer and npm
- Docker-compatible container runtime for the local Supabase stack
- Supabase CLI, or allow the included `npx supabase` scripts to download it

### Local development

```bash
git clone https://github.com/sjhelm1n/moderate-questions-panel.git
cd moderate-questions-panel
npm ci
cp .env.example .env.local
npm run db:start
npm run db:reset
```

Run `npx --yes supabase@3.2.0 status` and copy its API URL and publishable/anonymous key into `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-publishable-key
```

Then start the app:

```bash
npm run dev
```

Vite serves the application at <http://127.0.0.1:8080>. Local email messages are available in Supabase's Mailpit interface at <http://127.0.0.1:54324>.

Moderator registration is invitation-only. Invite the first moderator through Supabase Studio's Authentication users page; the database trigger creates the matching moderator profile. A direct self-signup receives only the non-privileged audience role, even if hosted signup is accidentally enabled.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project API URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe publishable or legacy anonymous key. Never use a service-role key. |

All `VITE_` variables are bundled into browser code and must be treated as public configuration.

## Database and security model

The canonical database is defined by [the Supabase migration](supabase/migrations/20261121004505_initial_open_source_schema.sql). It creates five public tables:

- `user_profiles`: moderator profile linked to `auth.users`
- `sessions`: moderator-owned event sessions
- `questions`: submitted and moderated questions
- `question_votes`: browser-identifier vote records
- `session_feedback`: post-session ratings and comments

Supabase Row Level Security is the authorization boundary. Anonymous users can read sessions, submit to active sessions through the restricted `submit_question` function, read only approved or asked questions, vote through the restricted `cast_vote` function, and submit feedback only after a session ends. Invited moderators can manage only sessions and related records they own.

### Defense-in-depth abuse limits

Anonymous participation is protected by several independent layers:

| Layer | Enforced limits |
| --- | --- |
| Browser UI | Question text is limited to 500 characters, submitter names to 100 characters, and feedback comments to 2,000 characters. |
| Public database functions | Questions are accepted only for active sessions, votes only for approved questions in active sessions, and feedback only after a session ends. Inputs are trimmed and validated again on the server. |
| Per-browser database throttles | Five questions per session per minute, sixty vote attempts per session per minute, one vote per question, and one feedback response per session. Only SHA-256 hashes of browser identifiers are retained. |
| Per-session database throttles | Question submissions and feedback submissions are each capped at 300 writes per session per minute, including requests from older clients. |
| Database authorization | Row Level Security, narrow grants, foreign keys, checks, and transactional session-state validation protect records even when someone bypasses the web interface and calls the API directly. |

These controls contain accidental loops and low-effort abuse, but a browser identifier is not proof of a person: a participant can clear browser storage, rotate identifiers, or distribute requests across devices. Internet-facing and high-profile deployments should add a final edge layer such as IP-based rate limiting, CAPTCHA or bot detection, request-size limits, and monitoring. See [SECURITY.md](SECURITY.md) and [docs/security-audit.md](docs/security-audit.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production bundle. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run strict TypeScript checks. |
| `npm test` | Run unit tests. |
| `npm run test:coverage` | Run unit tests with coverage thresholds. |
| `npm run test:e2e` | Run Playwright browser smoke tests. |
| `npm run check` | Run lint, types, unit tests, and production build. |
| `npm run db:start` | Start local Supabase services. |
| `npm run db:reset` | Recreate the local database from migrations and seed data. |
| `npm run db:test` | Run pgTAP database tests against local Supabase. |

## Project structure

```text
src/components/          Application and reusable UI components
src/hooks/               Auth, query, realtime, and mutation hooks
src/services/supabase/   Typed database access modules
src/types/               Database and domain types
supabase/migrations/     Canonical database migrations
supabase/tests/          pgTAP database contract tests
e2e/                     Playwright browser smoke tests
.github/                 CI, security analysis, templates, and ownership
docs/                    Architecture, deployment, and security notes
```

## Deployment

The repository includes a Vercel SPA rewrite and baseline security headers in `vercel.json`. A production deployment also requires a Supabase project with the migration applied and the correct Auth redirect URLs configured. Follow [docs/deployment.md](docs/deployment.md); do not expose database passwords or service-role credentials to Vite.

## Contributing and support

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [GOVERNANCE.md](GOVERNANCE.md) before opening a pull request. Use [SUPPORT.md](SUPPORT.md) for help and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

Licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution information.
