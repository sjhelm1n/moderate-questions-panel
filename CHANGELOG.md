# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-20

### Added

- Apache-2.0 licensing and open-source community documentation.
- Reproducible Supabase configuration and migrations.
- Automated lint, type, unit, database, build, and browser checks.
- Contributor governance, support, security, issue, and pull-request documentation.

### Changed

- Upgraded the development stack to Vite 8, Vitest 5, and React Router 7.
- Consolidated authentication, Supabase services, realtime subscriptions, voting, and toast handling.
- Removed obsolete polling implementations, duplicate components, unused UI primitives, and unused dependencies.
- Enabled strict TypeScript and unused-code checks.

### Security

- Database-enforced moderator ownership and restricted public data access.
- Hardened security-definer functions, redirects, external links, deployment headers, and dependency auditing.
