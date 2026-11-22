-- Lets a signed-in user delete their own account from the app
-- (right to erasure under the NDPA 2023 and the GDPR).
-- Pause & Pray keeps no other tables: prayer data stays on the phone.

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
