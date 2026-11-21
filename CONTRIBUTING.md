# Contributing

Thank you for helping improve Moderate Questions Panel.

## Before you begin

- Search existing issues and pull requests before opening a duplicate.
- Use GitHub Discussions or an issue for substantial design changes before implementation.
- Never include credentials, production data, or private participant feedback in an issue or commit.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local development

1. Install Node.js 22.12 or newer and a Docker-compatible container runtime.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run db:start`, then `npm run db:reset`.
5. Copy the local API URL and publishable key printed by `npx --yes supabase@3.2.0 status` into `.env.local`.
6. Run `npm run dev`.

## Quality checks

Run these before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run test:e2e
```

Database changes must include a migration and database tests. Create migrations with:

```bash
npx --yes supabase@3.2.0 migration new descriptive_name
```

## Pull requests

- Keep changes focused and explain user-visible behavior.
- Add or update tests for behavior changes.
- Update documentation and `.env.example` when configuration changes.
- Mark breaking changes clearly.
- By submitting a contribution, you agree that it is licensed under Apache-2.0 as described in [LICENSE](LICENSE).
