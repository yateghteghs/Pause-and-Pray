-- Admin console security tests. Runs after 01 (reuses its users and data).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@example.org');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
select id as youth_id from public.prayer_groups where name = 'Youth' \gset
grant usage on schema tests to authenticated;
create or replace function tests.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false), set_config('role', 'authenticated', false);
$$;

-- Ordinary users are refused everywhere.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.fails('select public.admin_overview()', 'not an administrator');
select tests.fails('select * from public.admin_list_plan_requests()', 'not an administrator');
select tests.fails('select * from public.admin_find_accounts(''example'')', 'not an administrator');
select tests.fails('select public.admin_guard(''x'')', 'permission denied');
select tests.check((select count(*) = 0 from public.admin_audit_log), 'users cannot read the audit log');
select tests.check((select count(*) = 0 from public.platform_admins), 'users cannot read the admin list');

-- A member can report their group; an outsider cannot.
insert into public.group_reports (group_id, reason) select id, 'Spam messages in the intention' from public.prayer_groups where name = 'Youth';
select tests.check((select count(*) = 0 from public.group_reports), 'reporters cannot read reports back');
select tests.as_user('00000000-0000-0000-0001-000000000020');
select tests.fails(format($q$insert into public.group_reports (group_id, reason) values (%L, 'nope')$q$, :'youth_id'), 'row-level security');

-- The admin sees totals and manages the system.
select tests.as_user('00000000-0000-0000-0000-0000000000ad');
select tests.check((select (public.admin_overview() ->> 'groups')::int = 2), 'overview counts groups');
select tests.check((select (public.admin_overview() ->> 'plan_revenue_naira')::int = 4000), 'overview sums plan revenue');
select tests.check((select jsonb_array_length(public.admin_overview() -> 'praying_by_day') = 30), 'overview has 30 days');
select tests.check((select (public.admin_overview() ->> 'reports_open')::int = 1), 'overview counts open reports');
select tests.check((select count(*) = 1 from public.admin_list_plan_requests()), 'lists plan requests');
select tests.check((select price_naira = 4000 from public.admin_list_organizations()), 'lists organisations with price');
select public.admin_update_organization((select id from public.admin_list_organizations() limit 1), 'parish', current_date + 400);
select tests.check((select tier = 'parish' and price_naira = 7500 from public.admin_list_organizations()), 'changes tier');
select tests.check((select count(*) = 1 from public.admin_list_reports('open')), 'lists open reports');
select public.admin_resolve_report((select id from public.admin_list_reports('open') limit 1), 'dismissed', 'Not spam');
select tests.check((select count(*) = 0 from public.admin_list_reports('open')), 'resolves reports');
select tests.fails('select * from public.admin_find_accounts(''ad'')', 'at least 3');
select tests.check((select count(*) = 1 from public.admin_find_accounts('ada@')), 'finds an account by email');
select tests.fails('select public.admin_delete_account(''00000000-0000-0000-0000-0000000000ad'', ''x'')', 'your own account');
select public.admin_delete_account('00000000-0000-0000-0001-000000000020', 'User asked by email');
reset role;
select tests.check((select count(*) = 0 from auth.users where email = 'm20@example.com'), 'deletes an account');
select tests.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_upsert_sponsor('lent-2027', 'Parish bookshop', 'Praying with you', 'https://example.org');
select tests.check((select name = 'Parish bookshop' from public.campaign_sponsors), 'saves a sponsor (public table)');
select public.admin_upsert_audio('prayer:hail-mary', 'en', 'https://example.org/hm.m4a', 'Fr. Moses');
select tests.check((select count(*) = 1 from public.audio_tracks), 'saves an audio track');
select tests.fails('select public.admin_remove_admin(''00000000-0000-0000-0000-0000000000ad'')', 'last administrator');
select public.admin_add_admin('ben@example.com');
select tests.check((select count(*) = 2 from public.admin_list_admins()), 'adds an admin');
select public.admin_delete_group(:'youth_id', 'Test cleanup');
select tests.check((select count(*) = 1 from public.admin_list_groups()), 'deletes a group');

-- Every change is in the audit log, with who did it.
select tests.check((select array_agg(action order by action) from public.admin_audit() where admin_email = 'admin@example.org')
  = array['account.delete', 'account.search', 'admin.add', 'audio.save', 'group.delete', 'organization.update', 'report.dismissed', 'sponsor.save'],
  'every change is audited');
select tests.check((select count(*) = 1 from public.admin_audit() where action = 'account.delete' and details ->> 'reason' = 'User asked by email'), 'audit keeps the reason');

-- Nothing in the admin functions returns who prayed on which day.
reset role;
select tests.check((select count(*) = 0 from information_schema.routines r
  join information_schema.parameters p on p.specific_name = r.specific_name
  where r.routine_name like 'admin\_%' and p.parameter_mode = 'OUT' and p.parameter_name in ('prayed_on', 'user_id_prayed')), 'no per-person prayer days in admin output');
