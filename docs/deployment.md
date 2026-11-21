# Deployment

## 1. Provision Supabase

Create a Supabase project and authenticate the CLI. Link this repository to the intended project, review the target, and apply migrations:

```bash
npx --yes supabase@3.2.0 login
npx --yes supabase@3.2.0 link --project-ref YOUR_PROJECT_REF
npx --yes supabase@3.2.0 migration list
npx --yes supabase@3.2.0 db push
```

Treat `db push` as a production database change. Review the migration and use a staging project first when existing data is present.

In Supabase Auth settings:

- set the Site URL to the production application origin;
- allow the exact production `/auth/confirm` and `/reset-password` URLs as redirects (use wildcards only for local development or preview deployments);
- disable public user signup and invite moderator accounts through the Supabase Dashboard or Admin API;
- require passwords of at least eight characters;
- enable leaked-password protection when the project plan supports it;
- require MFA for moderator accounts when the deployment risk warrants it;
- configure an SMTP provider before relying on production email delivery.

In API settings, expose only the `public` schema unless you intentionally add GraphQL clients; this application does not use `graphql_public`.

Never place the service-role key or database password in a `VITE_` variable.

## 2. Configure the web deployment

Set these build-time environment variables:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

Build with `npm run build`; the static output is written to `dist/`.

For Vercel, `vercel.json` supplies the SPA fallback and security headers. Other static hosts need an equivalent rewrite of unknown routes to `/index.html`, or routes such as `/session/:sessionId` and `/auth/confirm` will fail on direct navigation.

## 3. Verify before release

```bash
npm ci
npm run check
npm run test:coverage
npm run test:e2e
npm audit --audit-level=moderate
```

With local Supabase and Docker running:

```bash
npm run db:reset
npm run db:test
```

Then verify moderator invitation/confirmation, sign-in, session creation, anonymous submission, moderation, voting, session ending, feedback, and password recovery against the staged deployment.

## 4. Rollback

Web releases can be rolled back through the hosting provider. Database migrations are forward-only by default; prepare and test a corrective migration instead of editing production schema manually. Back up production data before high-risk changes.
