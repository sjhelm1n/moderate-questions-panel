-- SPDX-License-Identifier: Apache-2.0
-- Add inexpensive, database-enforced limits for anonymous public writes.

create table if not exists private.abuse_rate_limits (
  action text not null check (char_length(action) between 1 and 64),
  session_id uuid not null references public.sessions(id) on delete cascade,
  client_hash text not null check (client_hash ~ '^[0-9a-f]{64}$'),
  window_started timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (action, session_id, client_hash)
);

create index if not exists abuse_rate_limits_session_id_idx
  on private.abuse_rate_limits (session_id);

create table if not exists private.feedback_receipts (
  session_id uuid not null references public.sessions(id) on delete cascade,
  client_hash text not null check (client_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (session_id, client_hash)
);

revoke all on table private.abuse_rate_limits from public, anon, authenticated;
revoke all on table private.feedback_receipts from public, anon, authenticated;

create or replace function private.anonymous_client_hash(p_client_id text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if char_length(p_client_id) < 16
     or char_length(p_client_id) > 128
     or p_client_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid anonymous client identifier' using errcode = '22023';
  end if;

  return encode(sha256(convert_to(p_client_id, 'UTF8')), 'hex');
end;
$$;

create or replace function private.consume_rate_limit(
  p_action text,
  p_session_id uuid,
  p_client_hash text,
  p_window_seconds integer,
  p_request_limit integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_count integer;
begin
  if p_window_seconds not between 1 and 86400
     or p_request_limit not between 1 and 10000 then
    raise exception 'Invalid rate limit configuration' using errcode = '22023';
  end if;

  insert into private.abuse_rate_limits as limits (
    action,
    session_id,
    client_hash,
    window_started,
    request_count
  )
  values (p_action, p_session_id, p_client_hash, v_now, 1)
  on conflict (action, session_id, client_hash)
  do update set
    window_started = case
      when limits.window_started <= excluded.window_started - make_interval(secs => p_window_seconds)
        then excluded.window_started
      else limits.window_started
    end,
    request_count = case
      when limits.window_started <= excluded.window_started - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end
  returning request_count into v_count;

  if v_count > p_request_limit then
    raise exception 'Rate limit exceeded. Please wait and try again.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.anonymous_client_hash(text) from public, anon, authenticated;
revoke all on function private.consume_rate_limit(text, uuid, text, integer, integer)
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_feedback_comment_length_check'
      and conrelid = 'public.session_feedback'::regclass
  ) then
    alter table public.session_feedback
      add constraint session_feedback_comment_length_check
      check (comment is null or char_length(comment) <= 2000);
  end if;
end $$;

-- Keep legacy direct feedback inserts working while applying a session-wide
-- safety valve. New clients use submit_feedback for one-per-browser behavior.
create or replace function private.enforce_feedback_insert_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.consume_rate_limit(
    'feedback_session',
    new.session_id,
    repeat('0', 64),
    60,
    300
  );
  return new;
end;
$$;

revoke all on function private.enforce_feedback_insert_limit()
  from public, anon, authenticated;

drop trigger if exists session_feedback_rate_limit on public.session_feedback;
create trigger session_feedback_rate_limit
before insert on public.session_feedback
for each row execute function private.enforce_feedback_insert_limit();

-- Preserve compatibility with already-deployed clients that omit p_client_id;
-- they still receive the session-wide cap, while updated clients get both caps.
drop function if exists public.submit_question(uuid, text, text);
create function public.submit_question(
  p_session_id uuid,
  p_content text,
  p_submitter_name text default null,
  p_client_id text default null
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
  v_client_hash text;
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

  if p_client_id is not null then
    v_client_hash := private.anonymous_client_hash(p_client_id);
    perform private.consume_rate_limit(
      'question_client', p_session_id, v_client_hash, 60, 5
    );
  end if;

  perform private.consume_rate_limit(
    'question_session', p_session_id, repeat('0', 64), 60, 300
  );

  insert into public.questions (session_id, content, submitter_name)
  values (p_session_id, v_content, coalesce(v_submitter_name, 'Anonymous'))
  returning id into v_question_id;

  return v_question_id;
end;
$$;

revoke all on function public.submit_question(uuid, text, text, text) from public;
grant execute on function public.submit_question(uuid, text, text, text) to anon, authenticated;

create or replace function public.submit_feedback(
  p_session_id uuid,
  p_rating integer,
  p_comment text,
  p_client_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_status text;
  v_feedback_id uuid;
  v_comment text := nullif(btrim(p_comment), '');
  v_client_hash text := private.anonymous_client_hash(p_client_id);
begin
  if p_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'Feedback comment must not exceed 2000 characters'
      using errcode = '22023';
  end if;

  select s.status
  into v_session_status
  from public.sessions s
  where s.id = p_session_id
  for share;

  if v_session_status is distinct from 'ended' then
    raise exception 'Feedback is available only after the session ends'
      using errcode = '22023';
  end if;

  insert into private.feedback_receipts (session_id, client_hash)
  values (p_session_id, v_client_hash)
  on conflict (session_id, client_hash) do nothing;

  if not found then
    raise exception 'Feedback has already been submitted from this browser'
      using errcode = '23505';
  end if;

  insert into public.session_feedback (session_id, rating, comment)
  values (p_session_id, p_rating, v_comment)
  returning id into v_feedback_id;

  return v_feedback_id;
end;
$$;

revoke all on function public.submit_feedback(uuid, integer, text, text) from public;
grant execute on function public.submit_feedback(uuid, integer, text, text) to anon, authenticated;

-- Voting already has one-vote-per-question uniqueness; this cap prevents a
-- broken or scripted client from cycling rapidly across many questions.
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
  v_client_hash text := private.anonymous_client_hash(p_voter_id);
begin
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

  perform private.consume_rate_limit(
    'vote_client', p_session_id, v_client_hash, 60, 60
  );

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
