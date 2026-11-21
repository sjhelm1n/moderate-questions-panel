-- SPDX-License-Identifier: Apache-2.0
-- Repair legacy vote totals and enforce authorization and lifecycle invariants.

-- A vote must reference the same session as its question. Existing production
-- data is checked before this migration is applied.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_id_session_id_key'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_id_session_id_key unique (id, session_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'question_votes_question_session_fkey'
      and conrelid = 'public.question_votes'::regclass
  ) then
    alter table public.question_votes
      add constraint question_votes_question_session_fkey
      foreign key (question_id, session_id)
      references public.questions (id, session_id)
      on delete cascade;
  end if;
end $$;

-- The legacy dashboard-managed schema could contain vote rows created before
-- the canonical counter triggers existed. Rebuild the cache from its source of truth.
update public.questions q
set vote_count = (
  select count(*)::integer
  from public.question_votes v
  where v.question_id = q.id
)
where q.vote_count <> (
  select count(*)::integer
  from public.question_votes v
  where v.question_id = q.id
);

create or replace function private.enforce_session_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'ended' and new.status <> old.status then
    raise exception 'Ended sessions cannot be reopened' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_enforce_status_transition on public.sessions;
create trigger sessions_enforce_status_transition
before update of status on public.sessions
for each row execute function private.enforce_session_status_transition();

-- Public question submission is an RPC so the active-session check and insert
-- are serialized against a concurrent session close.
create or replace function public.submit_question(
  p_session_id uuid,
  p_content text,
  p_submitter_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_status text;
  v_question_id uuid;
  v_content text := btrim(p_content);
  v_submitter_name text := nullif(btrim(p_submitter_name), '');
begin
  if v_content is null or char_length(v_content) not between 1 and 500 then
    raise exception 'Question content must contain between 1 and 500 characters'
      using errcode = '22023';
  end if;

  if v_submitter_name is not null and char_length(v_submitter_name) > 100 then
    raise exception 'Submitter name must not exceed 100 characters'
      using errcode = '22023';
  end if;

  select s.status
  into v_session_status
  from public.sessions s
  where s.id = p_session_id
  for share;

  if v_session_status is distinct from 'active' then
    raise exception 'Session is not accepting questions' using errcode = '22023';
  end if;

  insert into public.questions (session_id, content, submitter_name)
  values (p_session_id, v_content, coalesce(v_submitter_name, 'Anonymous'))
  returning id into v_question_id;

  return v_question_id;
end;
$$;

revoke all on function public.submit_question(uuid, text, text) from public;
grant execute on function public.submit_question(uuid, text, text) to anon, authenticated;

-- Lock both records while validating so a close or moderation update cannot
-- race between the check and vote insertion.
create or replace function public.cast_vote(
  p_question_id uuid,
  p_session_id uuid,
  p_voter_id text
)
returns table (vote_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_status text;
  v_session_status text;
begin
  if p_voter_id is null
     or char_length(p_voter_id) < 16
     or char_length(p_voter_id) > 128
     or p_voter_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid voter identifier' using errcode = '22023';
  end if;

  select q.status, s.status
  into v_question_status, v_session_status
  from public.questions q
  join public.sessions s on s.id = q.session_id
  where q.id = p_question_id
    and q.session_id = p_session_id
  for update of q, s;

  if v_question_status is distinct from 'approved'
     or v_session_status is distinct from 'active' then
    raise exception 'Question is not open for voting' using errcode = '22023';
  end if;

  insert into public.question_votes (question_id, session_id, voter_id)
  values (p_question_id, p_session_id, p_voter_id)
  on conflict (question_id, voter_id) do nothing;

  return query
  select q.vote_count
  from public.questions q
  where q.id = p_question_id;
end;
$$;

revoke all on function public.cast_vote(uuid, uuid, text) from public;
grant execute on function public.cast_vote(uuid, uuid, text) to anon, authenticated;

-- Direct anonymous question inserts bypass the serialized session check.
drop policy if exists questions_public_submit_active on public.questions;
revoke insert on table public.questions from anon, authenticated;

-- The role column is authoritative. Authenticated audience accounts must not
-- acquire moderator capabilities by calling the Data API directly.
drop policy if exists sessions_insert_own on public.sessions;
create policy sessions_insert_own
on public.sessions for insert
to authenticated
with check (
  moderator_id = (select auth.uid())
  and exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
);

drop policy if exists sessions_update_own on public.sessions;
create policy sessions_update_own
on public.sessions for update
to authenticated
using (
  moderator_id = (select auth.uid())
  and exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
)
with check (
  moderator_id = (select auth.uid())
  and exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
);

-- There is no product-level destructive delete flow. Session closure preserves
-- questions and feedback; auth-user deletion remains the explicit cascade path.
drop policy if exists sessions_delete_own on public.sessions;
revoke delete on table public.sessions from authenticated;

drop policy if exists questions_authenticated_read on public.questions;
create policy questions_authenticated_read
on public.questions for select
to authenticated
using (
  status in ('approved', 'asked')
  or (
    exists (
      select 1
      from public.user_profiles p
      where p.id = (select auth.uid())
        and p.role = 'moderator'
    )
    and exists (
      select 1
      from public.sessions s
      where s.id = questions.session_id
        and s.moderator_id = (select auth.uid())
    )
  )
);

drop policy if exists questions_moderator_update on public.questions;
create policy questions_moderator_update
on public.questions for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
  and exists (
    select 1
    from public.sessions s
    where s.id = questions.session_id
      and s.moderator_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
  and exists (
    select 1
    from public.sessions s
    where s.id = questions.session_id
      and s.moderator_id = (select auth.uid())
  )
);

drop policy if exists feedback_moderator_read on public.session_feedback;
create policy feedback_moderator_read
on public.session_feedback for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.role = 'moderator'
  )
  and exists (
    select 1
    from public.sessions s
    where s.id = session_feedback.session_id
      and s.moderator_id = (select auth.uid())
  )
);

-- Restrict server-owned identifiers, timestamps, counters, and initial states.
revoke insert on table public.sessions from authenticated;
grant insert (name, description, moderator_id) on table public.sessions to authenticated;

revoke update on table public.sessions from authenticated;
grant update (name, description, status) on table public.sessions to authenticated;

revoke update on table public.questions from authenticated;
grant update (status, priority) on table public.questions to authenticated;

revoke update on table public.user_profiles from authenticated;
grant update (full_name) on table public.user_profiles to authenticated;

-- Vote rows are not consumed directly and need not be published to Realtime.
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'question_votes'
  ) then
    alter publication supabase_realtime drop table public.question_votes;
  end if;
end $$;
