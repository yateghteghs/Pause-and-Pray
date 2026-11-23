-- Admin console (admin/). Platform admins manage plans, organisations, groups,
-- reports, accounts, sponsors and audio. Every action goes through a function
-- below that checks the caller is an admin and writes to the audit log.
--
-- Privacy by design: admins see totals and organisational data, never a
-- person's prayers, intentions or history (those stay on the phone), and never
-- which members prayed on which day.
--
-- First admin (run once in the SQL editor, after signing up in the app):
--   insert into public.platform_admins (user_id) select id from auth.users where email = 'you@example.org';

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users (id) on delete set null
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  admin_email text,
  action text not null,
  target text,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);

create table public.group_reports (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.prayer_groups (id) on delete cascade,
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text check (char_length(resolution) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.platform_admins enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.group_reports enable row level security;

-- Members can report a group they belong to; nobody reads reports except through admin functions.
create policy "members report their group" on public.group_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_group_member(group_id));

-- ------------------------------------------------------------------ helpers

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;

create or replace function public.admin_guard(p_action text, p_target text default null, p_details jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'Not an administrator'; end if;
  if p_action is not null then
    insert into public.admin_audit_log (admin_id, admin_email, action, target, details)
    values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_target, coalesce(p_details, '{}'));
  end if;
end;
$$;

create or replace function public.tier_price(p_tier text) returns integer
language sql immutable as $$
  select case p_tier when 'group' then 4000 when 'parish' then 7500 when 'community' then 10000 else 0 end;
$$;

-- ------------------------------------------------------------------ overview

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  perform public.admin_guard(null);
  select jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'accounts_new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'groups', (select count(*) from public.prayer_groups),
    'groups_active_7d', (select count(distinct group_id) from public.prayer_group_days where prayed_on > current_date - 7),
    'group_members', (select count(*) from public.prayer_group_members),
    'organizations_active', (select count(*) from public.organizations where plan_active_until > now()),
    'organizations_expiring_30d', (select count(*) from public.organizations
       where plan_active_until > now() and plan_active_until < now() + interval '30 days'),
    'plan_revenue_naira', (select coalesce(sum(public.tier_price(tier)), 0) from public.organizations where plan_active_until > now()),
    'plan_requests_new', (select count(*) from public.plan_requests where status = 'new'),
    'reports_open', (select count(*) from public.group_reports where status = 'open'),
    -- Totals only: how many group members prayed each day (not who).
    'praying_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'members', d.members) order by d.day), '[]')
      from (
        select gs::date as day, (select count(distinct x.user_id) from public.prayer_group_days x where x.prayed_on = gs::date) as members
        from generate_series(current_date - 29, current_date, interval '1 day') gs
      ) d
    )
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------------------ plan requests and organisations

create or replace function public.admin_list_plan_requests(p_status text default null)
returns table (id uuid, created_at timestamptz, status text, tier text, price_naira integer, org_name text, org_kind text,
  contact_name text, contact_email text, country text, expected_members integer, message text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  return query select r.id, r.created_at, r.status, r.tier, public.tier_price(r.tier), r.org_name, r.org_kind,
    r.contact_name, r.contact_email, r.country, r.expected_members, r.message
  from public.plan_requests r where p_status is null or r.status = p_status order by r.created_at desc;
end;
$$;

create or replace function public.admin_set_plan_request_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('plan_request.status', p_id::text, jsonb_build_object('status', p_status));
  update public.plan_requests set status = p_status where id = p_id;
  if not found then raise exception 'No such request'; end if;
end;
$$;

create or replace function public.admin_activate_plan_request(p_id uuid, p_until date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  o public.organizations;
begin
  perform public.admin_guard('plan_request.activate', p_id::text, jsonb_build_object('until', p_until));
  if p_until <= current_date then raise exception 'The paid-until date must be in the future'; end if;
  o := public.activate_parish_plan(p_id, p_until);
  return o.id;
end;
$$;

create or replace function public.admin_list_organizations(p_search text default null)
returns table (id uuid, name text, kind text, tier text, price_naira integer, plan_active_until timestamptz,
  groups integer, members integer, leaders text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  return query select o.id, o.name, o.kind, o.tier, public.tier_price(o.tier), o.plan_active_until,
    public.org_group_count(o.id), public.org_member_count(o.id),
    (select string_agg(u.email, ', ') from public.organization_admins a join auth.users u on u.id = a.user_id where a.org_id = o.id)
  from public.organizations o
  where p_search is null or o.name ilike '%' || p_search || '%'
  order by o.plan_active_until nulls last;
end;
$$;

create or replace function public.admin_update_organization(p_id uuid, p_tier text, p_until date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('organization.update', p_id::text, jsonb_build_object('tier', p_tier, 'until', p_until));
  update public.organizations set tier = p_tier, plan_active_until = p_until where id = p_id;
  if not found then raise exception 'No such organisation'; end if;
end;
$$;

-- ------------------------------------------------------------------ groups and reports

create or replace function public.admin_list_groups(p_search text default null)
returns table (id uuid, name text, intention text, org_name text, members integer, created_at timestamptz,
  last_active date, open_reports integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  return query select g.id, g.name, g.intention, o.name,
    (select count(*)::int from public.prayer_group_members m where m.group_id = g.id),
    g.created_at,
    (select max(d.prayed_on) from public.prayer_group_days d where d.group_id = g.id),
    (select count(*)::int from public.group_reports r where r.group_id = g.id and r.status = 'open')
  from public.prayer_groups g left join public.organizations o on o.id = g.org_id
  where p_search is null or g.name ilike '%' || p_search || '%' or g.invite_code = upper(p_search)
  order by g.created_at desc limit 200;
end;
$$;

create or replace function public.admin_delete_group(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  n text;
begin
  select name into n from public.prayer_groups where id = p_id;
  if n is null then raise exception 'No such group'; end if;
  perform public.admin_guard('group.delete', p_id::text, jsonb_build_object('name', n, 'reason', p_reason));
  delete from public.prayer_groups where id = p_id;
end;
$$;

create or replace function public.admin_list_reports(p_status text default 'open')
returns table (id bigint, group_id uuid, group_name text, group_intention text, reason text, status text,
  resolution text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  -- The reporter is not shown, to protect members who report.
  return query select r.id, r.group_id, g.name, g.intention, r.reason, r.status, r.resolution, r.created_at
  from public.group_reports r join public.prayer_groups g on g.id = r.group_id
  where p_status is null or r.status = p_status order by r.created_at desc;
end;
$$;

create or replace function public.admin_resolve_report(p_id bigint, p_status text, p_resolution text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('report.' || p_status, p_id::text, jsonb_build_object('resolution', p_resolution));
  update public.group_reports set status = p_status, resolution = p_resolution, resolved_at = now() where id = p_id;
  if not found then raise exception 'No such report'; end if;
end;
$$;

-- ------------------------------------------------------------------ accounts

create or replace function public.admin_find_accounts(p_email text)
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, groups integer, leads text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard('account.search', null, jsonb_build_object('query', p_email));
  if char_length(trim(coalesce(p_email, ''))) < 3 then raise exception 'Type at least 3 characters of the email'; end if;
  -- Support lookup only: no prayer data exists on the server to show.
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at,
    (select count(*)::int from public.prayer_group_members m where m.user_id = u.id),
    (select string_agg(o.name, ', ') from public.organization_admins a join public.organizations o on o.id = a.org_id where a.user_id = u.id)
  from auth.users u where u.email ilike '%' || trim(p_email) || '%' order by u.email limit 50;
end;
$$;

create or replace function public.admin_delete_account(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e text;
begin
  select email into e from auth.users where id = p_id;
  if e is null then raise exception 'No such account'; end if;
  if p_id = auth.uid() then raise exception 'You cannot delete your own account here'; end if;
  perform public.admin_guard('account.delete', p_id::text, jsonb_build_object('email', e, 'reason', p_reason));
  delete from auth.users where id = p_id;
end;
$$;

-- ------------------------------------------------------------------ content: sponsors and audio

create or replace function public.admin_upsert_sponsor(p_key text, p_name text, p_message text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('sponsor.save', p_key, jsonb_build_object('name', p_name));
  insert into public.campaign_sponsors (campaign_key, name, message, url) values (p_key, p_name, nullif(p_message, ''), nullif(p_url, ''))
  on conflict (campaign_key) do update set name = excluded.name, message = excluded.message, url = excluded.url, updated_at = now();
end;
$$;

create or replace function public.admin_delete_sponsor(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('sponsor.delete', p_key);
  delete from public.campaign_sponsors where campaign_key = p_key;
end;
$$;

create or replace function public.admin_upsert_audio(p_key text, p_language text, p_url text, p_credit text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('audio.save', p_key, jsonb_build_object('language', p_language));
  insert into public.audio_tracks (key, language, url, credit) values (p_key, p_language, p_url, nullif(p_credit, ''))
  on conflict (key, language) do update set url = excluded.url, credit = excluded.credit, updated_at = now();
end;
$$;

create or replace function public.admin_delete_audio(p_key text, p_language text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('audio.delete', p_key, jsonb_build_object('language', p_language));
  delete from public.audio_tracks where key = p_key and language = p_language;
end;
$$;

-- ------------------------------------------------------------------ admins and audit log

create or replace function public.admin_list_admins() returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  return query select a.user_id, u.email::text, a.added_at from public.platform_admins a join auth.users u on u.id = a.user_id order by a.added_at;
end;
$$;

create or replace function public.admin_add_admin(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  perform public.admin_guard('admin.add', p_email);
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No account with that email. They must sign up in the app first.'; end if;
  insert into public.platform_admins (user_id, added_by) values (uid, auth.uid()) on conflict do nothing;
end;
$$;

create or replace function public.admin_remove_admin(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_guard('admin.remove', p_user::text);
  if (select count(*) from public.platform_admins) <= 1 then raise exception 'You cannot remove the last administrator'; end if;
  delete from public.platform_admins where user_id = p_user;
end;
$$;

create or replace function public.admin_audit(p_limit integer default 100)
returns table (at timestamptz, admin_email text, action text, target text, details jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard(null);
  return query select l.at, l.admin_email, l.action, l.target, l.details from public.admin_audit_log l order by l.at desc limit least(p_limit, 500);
end;
$$;

-- Only signed-in users may call these (each checks for an admin); nobody may call the guard or helpers directly.
do $$
declare
  f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'admin\_%' loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function public.admin_guard(text, text, jsonb) from public, anon, authenticated;
