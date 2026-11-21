# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting or Security Advisory feature for this repository. Include affected versions, reproduction steps, impact, and any suggested mitigation. Do not include real participant data, credentials, access tokens, or database exports.

Maintainers will acknowledge a complete report as soon as practical, investigate it, and coordinate disclosure after a fix is available.

## Supported versions

Until the project reaches 1.0, security fixes are made on the latest release line only.

## Security model

- Supabase Row Level Security is the authorization boundary.
- Browser role checks are user-interface conveniences, not security controls.
- `VITE_SUPABASE_URL` and the publishable/anonymous key are public browser configuration.
- Service-role keys, database passwords, and private API credentials must never be committed or exposed to the browser.
- Anonymous voting uses a browser-generated identifier to discourage duplicate votes. It is not strong identity verification or a substitute for server-side rate limiting.
