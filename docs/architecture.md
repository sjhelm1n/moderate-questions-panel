# Architecture

## System overview

Moderate Questions Panel is a client-rendered single-page application backed directly by Supabase. There is no custom application server and no service-role credential in the browser.

```text
Participant or moderator browser
        |
        | HTTPS / WebSocket using a publishable key
        v
Supabase Auth + PostgREST + Realtime
        |
        v
Postgres tables, RLS policies, triggers, and validated public-write RPCs
```

## Frontend boundaries

- `src/components` owns rendering and user interaction.
- `src/hooks` owns authentication state, TanStack Query state, realtime invalidation, and mutations.
- `src/services/supabase` is the only application-specific database access layer.
- `src/types/database.ts` describes the API-facing schema; `src/types/domain.ts` provides UI-safe domain types.
- `src/App.tsx` owns the route tree and shared providers.

The session view uses one realtime channel for session and question changes. Events invalidate TanStack Query cache entries, and a 60-second poll recovers from dropped websocket messages. Components do not create independent polling loops.

## Authorization boundaries

Browser role checks decide what UI to display but do not grant access. Database privileges and Row Level Security in the canonical migration enforce access:

- session mutations require `moderator_id = auth.uid()`;
- unmoderated questions are visible only to their session's moderator;
- public question inserts use a transactional RPC that locks and validates the active session;
- feedback inserts are limited to ended sessions;
- vote rows are not directly exposed to Data API roles; voting uses `cast_vote`.
- anonymous questions, votes, and feedback pass through database-enforced burst limits keyed by a hashed per-session browser identifier; session-wide caps protect against request floods.

The `private` schema contains trigger functions and is not exposed through the Data API.

## Data lifecycle

1. An invited account receives a moderator profile through an `auth.users` trigger.
2. The moderator creates a session and shares its `/session/:sessionId` URL.
3. Participants submit questions with status `submitted`.
4. The owner changes questions to `approved`, `asked`, or `ignore`.
5. Participants view approved/asked questions and cast votes on approved questions.
6. Ending a session disables question submission and enables anonymous feedback.

## Known trust limits

- A browser-generated voter ID provides only best-effort duplicate prevention.
- Anonymous submission and feedback need deployment-level rate limiting for hostile public traffic.
- Realtime improves responsiveness; database reads remain authoritative.
