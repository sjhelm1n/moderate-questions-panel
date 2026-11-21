-- SPDX-License-Identifier: Apache-2.0
-- Canonical schema for Moderate Questions Panel.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'audience' check (role in ('moderator', 'audience')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  moderator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  content text not null,
  submitter_name text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'ignore', 'asked')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  vote_count integer not null default 0 check (vote_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (question_id, voter_id)
);

create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Bring the previously dashboard-managed schema up to the canonical constraints.
alter table public.user_profiles alter column role set default 'moderator';
update public.user_profiles set role = 'moderator' where role is null;
alter table public.user_profiles alter column role set not null;
update public.user_profiles set created_at = now() where created_at is null;
update public.user_profiles set updated_at = now() where updated_at is null;
alter table public.user_profiles alter column created_at set not null;
alter table public.user_profiles alter column updated_at set not null;

update public.sessions set status = 'active' where status is null;
update public.sessions set created_at = now() where created_at is null;
update public.sessions set updated_at = now() where updated_at is null;
alter table public.sessions alter column status set not null;
alter table public.sessions alter column moderator_id set not null;
alter table public.sessions alter column created_at set not null;
alter table public.sessions alter column updated_at set not null;
alter table public.sessions alter column name set not null;

update public.questions set status = 'submitted' where status is null;
update public.questions set priority = 'medium' where priority is null;
update public.questions set created_at = now() where created_at is null;
update public.questions set updated_at = now() where updated_at is null;
alter table public.questions alter column session_id set not null;
alter table public.questions alter column content set not null;
alter table public.questions alter column status set not null;
alter table public.questions alter column priority set not null;
alter table public.questions alter column created_at set not null;
alter table public.questions alter column updated_at set not null;

update public.question_votes set created_at = now() where created_at is null;
alter table public.question_votes alter column question_id set not null;
alter table public.question_votes alter column session_id set not null;
alter table public.question_votes alter column voter_id set not null;
alter table public.question_votes alter column created_at set not null;

update public.session_feedback set created_at = now() where created_at is null;
alter table public.session_feedback alter column session_id set not null;
alter table public.session_feedback alter column rating set not null;
alter table public.session_feedback alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profiles_role_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_role_check
      check (role in ('moderator', 'audience'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_status_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_status_check
      check (status in ('active', 'paused', 'ended'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_name_length_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_name_length_check
      check (char_length(btrim(name)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_status_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_status_check
      check (status in ('submitted', 'approved', 'ignore', 'asked'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_priority_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_priority_check
      check (priority in ('high', 'medium', 'low'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_description_length_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_description_length_check
      check (description is null or char_length(description) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_feedback_rating_check'
      and conrelid = 'public.session_feedback'::regclass
  ) then
    alter table public.session_feedback
      add constraint session_feedback_rating_check
      check (rating between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_content_length_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_content_length_check
      check (char_length(btrim(content)) between 1 and 500);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_submitter_name_length_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_submitter_name_length_check
      check (submitter_name is null or char_length(submitter_name) <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_vote_count_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_vote_count_check check (vote_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_votes_question_id_voter_id_key'
      and conrelid = 'public.question_votes'::regclass
  ) then
    alter table public.question_votes
      add constraint question_votes_question_id_voter_id_key
      unique (question_id, voter_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_feedback_comment_length_check'
      and conrelid = 'public.session_feedback'::regclass
  ) then
    alter table public.session_feedback
      add constraint session_feedback_comment_length_check
      check (comment is null or char_length(comment) <= 2000);
  end if;
end $$;

create index if not exists sessions_moderator_status_created_idx
  on public.sessions (moderator_id, status, created_at desc);
create index if not exists questions_session_status_votes_idx
  on public.questions (session_id, status, vote_count desc, created_at desc);
create index if not exists question_votes_session_id_idx
  on public.question_votes (session_id);
create index if not exists session_feedback_session_created_idx
  on public.session_feedback (session_id, created_at desc);

-- Replace legacy single-column indexes now covered by the query-specific indexes above.
drop index if exists public.idx_questions_created_at;
drop index if exists public.idx_questions_session_id;
drop index if exists public.idx_questions_status;
drop index if exists public.idx_session_feedback_session_id;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function private.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function private.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function private.set_updated_at();

create or replace function private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.invited_at is not null then 'moderator' else 'audience' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function private.create_user_profile();

insert into public.user_profiles (id, email, full_name, role)
select
  id,
  coalesce(email, ''),
  nullif(raw_user_meta_data ->> 'full_name', ''),
  case when invited_at is not null then 'moderator' else 'audience' end
from auth.users
on conflict (id) do nothing;

create or replace function private.increment_question_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.questions
  set vote_count = vote_count + 1
  where id = new.question_id;
  return new;
end;
$$;

create or replace function private.decrement_question_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.questions
  set vote_count = greatest(vote_count - 1, 0)
  where id = old.question_id;
  return old;
end;
$$;

drop trigger if exists trg_question_vote_insert on public.question_votes;
create trigger trg_question_vote_insert
after insert on public.question_votes
for each row execute function private.increment_question_vote_count();

drop trigger if exists trg_question_vote_delete on public.question_votes;
create trigger trg_question_vote_delete
after delete on public.question_votes
for each row execute function private.decrement_question_vote_count();

drop function if exists public.on_question_vote_insert();
drop function if exists public.on_question_vote_delete();

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
begin
  if p_voter_id is null
     or char_length(p_voter_id) < 16
     or char_length(p_voter_id) > 128
     or p_voter_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid voter identifier' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.questions q
    join public.sessions s on s.id = q.session_id
    where q.id = p_question_id
      and q.session_id = p_session_id
      and q.status = 'approved'
      and s.status = 'active'
  ) then
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

alter table public.user_profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.questions enable row level security;
alter table public.question_votes enable row level security;
alter table public.session_feedback enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'user_profiles',
        'sessions',
        'questions',
        'question_votes',
        'session_feedback'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy user_profiles_select_own
on public.user_profiles for select
to authenticated
using (id = (select auth.uid()));

create policy user_profiles_update_own
on public.user_profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy sessions_public_read
on public.sessions for select
to anon, authenticated
using (true);

create policy sessions_insert_own
on public.sessions for insert
to authenticated
with check (moderator_id = (select auth.uid()));

create policy sessions_update_own
on public.sessions for update
to authenticated
using (moderator_id = (select auth.uid()))
with check (moderator_id = (select auth.uid()));

create policy sessions_delete_own
on public.sessions for delete
to authenticated
using (moderator_id = (select auth.uid()));

create policy questions_public_read_moderated
on public.questions for select
to anon
using (status in ('approved', 'asked'));

create policy questions_authenticated_read
on public.questions for select
to authenticated
using (
  status in ('approved', 'asked')
  or exists (
    select 1 from public.sessions s
    where s.id = questions.session_id
      and s.moderator_id = (select auth.uid())
  )
);

create policy questions_public_submit_active
on public.questions for insert
to anon, authenticated
with check (
  status = 'submitted'
  and vote_count = 0
  and exists (
    select 1 from public.sessions s
    where s.id = questions.session_id
      and s.status = 'active'
  )
);

create policy questions_moderator_update
on public.questions for update
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = questions.session_id
      and s.moderator_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = questions.session_id
      and s.moderator_id = (select auth.uid())
  )
);

create policy feedback_public_submit_ended
on public.session_feedback for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_feedback.session_id
      and s.status = 'ended'
  )
);

create policy feedback_moderator_read
on public.session_feedback for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_feedback.session_id
      and s.moderator_id = (select auth.uid())
  )
);

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.question_votes from anon, authenticated;
revoke all on table public.session_feedback from anon, authenticated;

grant select on table public.user_profiles to authenticated;
grant update (full_name, updated_at) on table public.user_profiles to authenticated;

grant select on table public.sessions to anon, authenticated;
grant insert on table public.sessions to authenticated;
grant update (name, description, status, updated_at) on table public.sessions to authenticated;
grant delete on table public.sessions to authenticated;

grant select on table public.questions to anon, authenticated;
grant insert (session_id, content, submitter_name, status, vote_count) on table public.questions to anon, authenticated;
grant update (status, priority, updated_at) on table public.questions to authenticated;

grant insert (session_id, rating, comment) on table public.session_feedback to anon, authenticated;
grant select on table public.session_feedback to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'questions'
  ) then
    alter publication supabase_realtime add table public.questions;
  end if;
end $$;

comment on function public.cast_vote(uuid, uuid, text) is
  'Records one best-effort anonymous vote per browser-generated voter identifier.';
