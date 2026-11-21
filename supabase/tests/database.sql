begin;

create extension if not exists pgtap with schema extensions;
select plan(55);

select has_table('public', 'user_profiles', 'user_profiles exists');
select has_table('public', 'sessions', 'sessions exists');
select has_table('public', 'questions', 'questions exists');
select has_table('public', 'question_votes', 'question_votes exists');
select has_table('public', 'session_feedback', 'session_feedback exists');
select has_table('private', 'abuse_rate_limits', 'private rate limit buckets exist');
select has_table('private', 'feedback_receipts', 'private feedback receipts exist');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_profiles'::regclass),
  'user_profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.sessions'::regclass),
  'sessions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.questions'::regclass),
  'questions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.question_votes'::regclass),
  'question_votes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.session_feedback'::regclass),
  'session_feedback has RLS enabled'
);
select ok(
  (select column_default = '''audience''::text'
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'user_profiles'
     and column_name = 'role'),
  'new profiles default to the non-privileged audience role'
);
select ok(
  position(
    'new.invited_at is not null'
    in lower(pg_get_functiondef('private.create_user_profile()'::regprocedure))
  ) > 0,
  'only invited auth users are automatically provisioned as moderators'
);

select ok(
  to_regprocedure('public.cast_vote(uuid,uuid,text)') is not null,
  'cast_vote RPC exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.cast_vote(uuid,uuid,text)'::regprocedure),
  'cast_vote is security definer'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc where oid = 'public.cast_vote(uuid,uuid,text)'::regprocedure),
  'cast_vote has an empty search_path'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_update_own'),
  'sessions are updateable only through owner policy'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'questions' and policyname = 'questions_public_read_moderated'),
  'public question reads use moderated status policy'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'questions' and policyname = 'questions_moderator_update'),
  'question moderation has an owner policy'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'session_feedback' and policyname = 'feedback_moderator_read'),
  'feedback reads have a moderator policy'
);
select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'question_votes'),
  'vote rows have no direct data API policies'
);
select ok(
  not has_table_privilege('anon', 'public.question_votes', 'SELECT'),
  'anonymous clients cannot read vote rows directly'
);
select ok(
  not has_table_privilege('anon', 'public.question_votes', 'INSERT'),
  'anonymous clients cannot insert vote rows directly'
);
select ok(
  has_function_privilege('anon', 'public.cast_vote(uuid,uuid,text)', 'EXECUTE'),
  'anonymous clients can execute only the voting RPC'
);

select ok(
  to_regprocedure('public.submit_question(uuid,text,text,text)') is not null,
  'submit_question RPC exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.submit_question(uuid,text,text,text)'::regprocedure),
  'submit_question is security definer'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc where oid = 'public.submit_question(uuid,text,text,text)'::regprocedure),
  'submit_question has an empty search_path'
);
select ok(
  to_regprocedure('public.submit_question(uuid,text,text)') is null,
  'the unthrottled submit_question signature is removed'
);
select ok(
  not has_table_privilege('anon', 'public.questions', 'INSERT'),
  'anonymous clients cannot bypass submit_question with a direct insert'
);
select ok(
  has_function_privilege('anon', 'public.submit_question(uuid,text,text,text)', 'EXECUTE'),
  'anonymous clients can execute submit_question'
);
select ok(
  to_regprocedure('public.submit_feedback(uuid,integer,text,text)') is not null,
  'submit_feedback RPC exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.submit_feedback(uuid,integer,text,text)'::regprocedure),
  'submit_feedback is security definer'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc where oid = 'public.submit_feedback(uuid,integer,text,text)'::regprocedure),
  'submit_feedback has an empty search_path'
);
select ok(
  has_function_privilege('anon', 'public.submit_feedback(uuid,integer,text,text)', 'EXECUTE'),
  'anonymous clients can execute submit_feedback'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.session_feedback'::regclass
      and conname = 'session_feedback_comment_length_check'
      and contype = 'c'
  ),
  'feedback comment length is constrained'
);
select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.session_feedback'::regclass
      and tgname = 'session_feedback_rate_limit'
      and not tgisinternal
  ),
  'all feedback inserts receive a session-wide rate limit'
);
select ok(
  not has_table_privilege('anon', 'private.abuse_rate_limits', 'SELECT'),
  'anonymous clients cannot inspect rate limit buckets'
);
select ok(
  not has_table_privilege('anon', 'private.feedback_receipts', 'SELECT'),
  'anonymous clients cannot inspect feedback receipts'
);
select ok(
  not has_function_privilege('anon', 'private.anonymous_client_hash(text)', 'EXECUTE'),
  'anonymous clients cannot execute the private client hash helper'
);
select ok(
  not has_function_privilege(
    'anon',
    'private.consume_rate_limit(text,uuid,text,integer,integer)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the private rate limit helper'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.question_votes'::regclass
      and conname = 'question_votes_question_session_fkey'
      and contype = 'f'
  ),
  'votes enforce a matching question and session pair'
);
select ok(
  not exists (
    select 1
    from public.questions q
    where q.vote_count <> (
      select count(*)::integer
      from public.question_votes v
      where v.question_id = q.id
    )
  ),
  'cached question vote counts match vote rows'
);
select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.sessions'::regclass
      and tgname = 'sessions_enforce_status_transition'
      and not tgisinternal
  ),
  'ended sessions cannot be reopened'
);
select ok(
  not has_table_privilege('authenticated', 'public.sessions', 'DELETE'),
  'authenticated clients cannot delete sessions'
);
select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'question_votes'
  ),
  'private vote rows are not published through Realtime'
);
select ok(
  exists (
    select 1
    from pg_policy
    where polrelid = 'public.sessions'::regclass
      and polname = 'sessions_insert_own'
      and pg_get_expr(polwithcheck, polrelid) ~ 'role = ''moderator'''
  ),
  'session creation requires a moderator profile'
);
select ok(
  exists (
    select 1
    from pg_policy
    where polrelid = 'public.sessions'::regclass
      and polname = 'sessions_update_own'
      and pg_get_expr(polqual, polrelid) ~ 'role = ''moderator'''
  ),
  'session updates require a moderator profile'
);
select ok(
  exists (
    select 1
    from pg_policy
    where polrelid = 'public.questions'::regclass
      and polname = 'questions_moderator_update'
      and pg_get_expr(polqual, polrelid) ~ 'role = ''moderator'''
  ),
  'question moderation requires a moderator profile'
);

select has_index('public', 'sessions', 'sessions_moderator_status_created_idx', 'session owner queries are indexed');
select has_index('public', 'questions', 'questions_session_status_votes_idx', 'audience question queries are indexed');
select has_index('public', 'question_votes', 'question_votes_question_id_voter_id_key', 'duplicate votes are constrained');
select has_index('public', 'question_votes', 'question_votes_question_session_idx', 'vote relationship checks are indexed');
select has_index('public', 'session_feedback', 'session_feedback_session_created_idx', 'feedback queries are indexed');
select has_index('private', 'abuse_rate_limits', 'abuse_rate_limits_session_id_idx', 'rate limit cleanup is indexed');

select * from finish();
rollback;
