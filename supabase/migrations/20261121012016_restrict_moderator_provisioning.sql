-- SPDX-License-Identifier: Apache-2.0
-- Keep moderator authorization safe even if hosted public signup is enabled.

alter table public.user_profiles
  alter column role set default 'audience';

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
