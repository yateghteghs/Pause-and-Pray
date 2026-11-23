-- Security tests for groups, parish plans and public tables.
-- Run with supabase/tests/run.sh. Each check raises an error if it fails.

create schema if not exists tests;
create or replace function tests.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAILED: %', what; end if;
end $$;
create or replace function tests.fails(stmt text, expected text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAILED: expected an error (%) from: %', expected, stmt;
exception when others then
  if sqlerrm like 'FAILED:%' then raise; end if;
  if expected is not null and position(lower(expected) in lower(sqlerrm)) = 0 then
    raise exception 'FAILED: expected "%" but got "%" from: %', expected, sqlerrm, stmt;
  end if;
end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'chi@example.com');
insert into auth.users (id, email)
  select ('00000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid, 'm' || i || '@example.com' from generate_series(1, 20) i;

create or replace function tests.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false), set_config('role', 'authenticated', false);
$$;

-- 1. Ada creates a group and leads it.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t_group as select * from public.create_prayer_group('Youth', 'Ada', 'Our families', 20::smallint, 0::smallint, 'Africa/Lagos');
grant select on t_group to authenticated;
select tests.check((select char_length(invite_code) = 6 from t_group), 'invite code has 6 characters');
select tests.check((select role = 'admin' from public.prayer_group_members where user_id = auth.uid()), 'creator is admin');

-- 2. Ben cannot see the group before joining.
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) = 0 from public.prayer_groups), 'non-members cannot see the group');

-- 3. Ben joins with the code and sees the group and Ada.
select public.join_prayer_group((select lower(invite_code) from t_group), 'Ben');
select tests.check((select count(*) = 1 from public.prayer_groups), 'member sees the group');
select tests.check((select count(*) = 2 from public.prayer_group_members), 'member sees fellow members');

-- 4. Ben records his own prayer day, but not Ada's.
insert into public.prayer_group_days (group_id, user_id, prayed_on) select id, auth.uid(), current_date from t_group;
select tests.fails(format($q$insert into public.prayer_group_days (group_id, user_id, prayed_on) values (%L, %L, current_date)$q$,
  (select id from t_group), '00000000-0000-0000-0000-00000000000a'), 'row-level security');

-- 5. Ben (not a leader) cannot change the group.
update public.prayer_groups set intention = 'hijacked';
select tests.check((select intention = 'Our families' from public.prayer_groups), 'members cannot edit the group');

-- 6. Chi, outside the group, sees nothing.
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select tests.check((select count(*) = 0 from public.prayer_group_members), 'outsiders cannot see members');
select tests.check((select count(*) = 0 from public.prayer_group_days), 'outsiders cannot see prayer days');
select tests.fails('select public.join_prayer_group(''ZZZZZZ'', ''Chi'')', 'no group has that code');

-- 7. Ada edits the intention, but cannot move the group into an organisation directly.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
update public.prayer_groups set intention = 'Our parish';
select tests.check((select intention = 'Our parish' from public.prayer_groups), 'leader edits the group');
select tests.fails('update public.prayer_groups set org_id = gen_random_uuid()', 'permission denied');

-- 8. Free groups stop at 15 members.
do $$
declare i int;
begin
  for i in 1..13 loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0001-' || lpad(i::text, 12, '0'), false);
    perform public.join_prayer_group((select invite_code from t_group), 'Member ' || i);
  end loop;
end $$;
select tests.as_user('00000000-0000-0000-0001-000000000014');
select tests.fails(format('select public.join_prayer_group(%L, ''Sixteenth'')', (select invite_code from t_group)), 'group is full');

-- 9. Plan requests are private to their sender; activation is not open to users.
select tests.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.plan_requests (org_name, org_kind, contact_name, contact_email, tier) values ('St. Monica', 'parish', 'Ben', 'ben@example.com', 'group');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.check((select count(*) = 0 from public.plan_requests), 'others cannot see a plan request');
select tests.fails(format('select public.activate_parish_plan(gen_random_uuid(), current_date + 30)'), 'permission denied');

reset role;
select public.activate_parish_plan((select id from public.plan_requests limit 1), current_date + 365);

-- 10. Ben leads the organisation on the group tier: one group only.
select tests.as_user('00000000-0000-0000-0000-00000000000b');
create temp table t_org as select id from public.organizations;
grant select on t_org to authenticated;
select tests.check((select count(*) = 1 from t_org), 'leader sees the organisation');
select public.create_org_group((select id from t_org), 'CYON', 'Ben', null, 19::smallint, 0::smallint, 'Africa/Lagos', 'rosary-decade');
select tests.fails(format('select public.create_org_group(%L, ''Second'', ''Ben'')', (select id from t_org)), 'group limit');
select tests.check((select count(*) = 1 from public.org_dashboard((select id from t_org))), 'dashboard lists the group');

-- 11. Announcements: the plan group's leader posts; others cannot.
insert into public.group_announcements (group_id, body) select id, 'Rosary on Saturday' from public.prayer_groups where name = 'CYON';
select tests.check((select count(*) = 1 from public.group_announcements), 'leader posts an announcement');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.fails(format('select * from public.org_dashboard(%L)', (select id from t_org)), 'only organisation leaders');
select tests.fails(format($q$insert into public.group_announcements (group_id, body) values (%L, 'spam')$q$,
  (select id from t_group)), 'row-level security');

-- 12. Public tables can be read by anyone and written by no user.
select set_config('role', 'anon', false);
select tests.check((select count(*) = 0 from public.campaign_sponsors), 'anon reads sponsors');
select tests.check((select count(*) = 0 from public.audio_tracks), 'anon reads audio tracks');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.fails($q$insert into public.campaign_sponsors (campaign_key, name) values ('lent', 'Me')$q$, 'row-level security');
select tests.fails($q$insert into public.audio_tracks (key, language, url) values ('prayer:x', 'en', 'https://x.org/a.m4a')$q$, 'row-level security');

-- 13. Deleting your account removes you, and only you.
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select public.delete_my_account();
reset role;
select tests.check((select count(*) = 0 from auth.users where email = 'chi@example.com'), 'account deleted');
select tests.check((select count(*) = 1 from auth.users where email = 'ada@example.com'), 'other accounts kept');
