-- Parish plans: organisations (parishes, schools, chaplaincies, associations)
-- pay yearly, by invoice, for groups of any size, a leader dashboard,
-- announcements and a choice of group devotion.
--
-- Sales flow: a leader sends a request from the app (plan_requests). You
-- invoice them, then run, in the SQL editor:
--   select public.activate_parish_plan('<request id>', '2027-12-31');
-- which creates the organisation, makes the requester its admin and sets the
-- paid-until date. To renew, update organizations.plan_active_until.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  kind text not null default 'parish' check (kind in ('parish', 'school', 'chaplaincy', 'association', 'other')),
  plan_active_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.organization_admins (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (org_id, user_id)
);

create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_name text not null check (char_length(org_name) between 2 and 100),
  org_kind text not null check (org_kind in ('parish', 'school', 'chaplaincy', 'association', 'other')),
  contact_name text not null check (char_length(contact_name) between 1 and 100),
  contact_email text not null check (char_length(contact_email) between 3 and 200),
  country text check (char_length(country) <= 60),
  expected_members integer check (expected_members between 1 and 1000000),
  message text check (char_length(message) <= 1000),
  status text not null default 'new' check (status in ('new', 'invoiced', 'active', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.prayer_groups
  add column org_id uuid references public.organizations (id) on delete set null,
  add column devotion text not null default 'intentions'
    check (devotion in ('intentions', 'angelus', 'divine-mercy', 'rosary-decade'));

create table public.group_announcements (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.prayer_groups (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_admins enable row level security;
alter table public.plan_requests enable row level security;
alter table public.group_announcements enable row level security;

create or replace function public.is_org_admin(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_admins a where a.org_id = oid and a.user_id = auth.uid());
$$;

create or replace function public.org_plan_active(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select o.plan_active_until > now() from public.organizations o where o.id = oid), false);
$$;

-- Organisations: visible to their admins and to members of their groups. Only you change plans (no update policy).
create policy "admins and members see the organisation" on public.organizations for select to authenticated
  using (public.is_org_admin(id) or exists (
    select 1 from public.prayer_groups g where g.org_id = organizations.id and public.is_group_member(g.id)));
create policy "admins see their admin rows" on public.organization_admins for select to authenticated using (user_id = auth.uid());

-- Plan requests: anyone signed in can send one and see their own.
create policy "send a plan request" on public.plan_requests for insert to authenticated with check (user_id = auth.uid());
create policy "see my plan requests" on public.plan_requests for select to authenticated using (user_id = auth.uid());

-- Announcements: members read; group admins of parish-plan groups post and delete.
create policy "members read announcements" on public.group_announcements for select to authenticated
  using (public.is_group_member(group_id));
create policy "leaders post announcements" on public.group_announcements for insert to authenticated
  with check (author_id = auth.uid() and public.is_group_admin(group_id) and exists (
    select 1 from public.prayer_groups g where g.id = group_id and public.org_plan_active(g.org_id)));
create policy "leaders delete announcements" on public.group_announcements for delete to authenticated
  using (public.is_group_admin(group_id));

-- Group admins may edit only these columns; moving a group into an organisation goes through attach_group_to_org.
revoke update on public.prayer_groups from authenticated;
grant update (name, intention, prayer_hour, prayer_minute, timezone, devotion) on public.prayer_groups to authenticated;

create or replace function public.attach_group_to_org(p_group uuid, p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group) or not public.is_org_admin(p_org) then
    raise exception 'Only a leader of both the group and the organisation can do this';
  end if;
  update public.prayer_groups set org_id = p_org where id = p_group;
end;
$$;

-- Free groups hold up to 15 members; parish-plan groups have no limit.
create or replace function public.join_prayer_group(p_code text, p_display_name text) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
  members integer;
begin
  if auth.uid() is null then raise exception 'Sign in to join a group'; end if;
  select * into g from public.prayer_groups where invite_code = upper(trim(p_code));
  if not found then raise exception 'No group has that code'; end if;
  if exists (select 1 from public.prayer_group_members m where m.group_id = g.id and m.user_id = auth.uid()) then
    return g;
  end if;
  select count(*) into members from public.prayer_group_members m where m.group_id = g.id;
  if members >= 15 and not public.org_plan_active(g.org_id) then
    raise exception 'This group is full';
  end if;
  insert into public.prayer_group_members (group_id, user_id, display_name) values (g.id, auth.uid(), trim(p_display_name));
  return g;
end;
$$;

-- Leader dashboard: totals only, never who prayed what.
create or replace function public.org_dashboard(p_org uuid)
returns table (group_id uuid, group_name text, members integer, prayed_today integer, rate_7d numeric, rate_30d numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_org_admin(p_org) then raise exception 'Only organisation leaders can see the dashboard'; end if;
  return query
    select g.id, g.name,
      (select count(*)::int from public.prayer_group_members m where m.group_id = g.id),
      (select count(*)::int from public.prayer_group_days d where d.group_id = g.id and d.prayed_on = current_date),
      round(coalesce((select count(*) from public.prayer_group_days d where d.group_id = g.id and d.prayed_on > current_date - 7)::numeric
        / nullif((select count(*) from public.prayer_group_members m where m.group_id = g.id) * 7, 0), 0), 3),
      round(coalesce((select count(*) from public.prayer_group_days d where d.group_id = g.id and d.prayed_on > current_date - 30)::numeric
        / nullif((select count(*) from public.prayer_group_members m where m.group_id = g.id) * 30, 0), 0), 3)
    from public.prayer_groups g where g.org_id = p_org order by g.name;
end;
$$;

-- Org leaders can create groups straight inside their organisation.
create or replace function public.create_org_group(
  p_org uuid, p_name text, p_display_name text, p_intention text default null,
  p_hour smallint default null, p_minute smallint default null, p_timezone text default null,
  p_devotion text default 'intentions'
) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
begin
  if not public.is_org_admin(p_org) then raise exception 'Only organisation leaders can do this'; end if;
  g := public.create_prayer_group(p_name, p_display_name, p_intention, p_hour, p_minute, p_timezone);
  update public.prayer_groups set org_id = p_org, devotion = coalesce(p_devotion, 'intentions') where id = g.id returning * into g;
  return g;
end;
$$;

-- Run by you (service role) after a plan request is paid.
create or replace function public.activate_parish_plan(p_request uuid, p_until date) returns public.organizations
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests;
  o public.organizations;
begin
  select * into r from public.plan_requests where id = p_request;
  if not found then raise exception 'No such request'; end if;
  insert into public.organizations (name, kind, plan_active_until) values (r.org_name, r.org_kind, p_until)
  returning * into o;
  insert into public.organization_admins (org_id, user_id) values (o.id, r.user_id);
  update public.plan_requests set status = 'active' where id = p_request;
  return o;
end;
$$;

revoke all on function public.activate_parish_plan(uuid, date) from public, anon, authenticated;
revoke all on function public.attach_group_to_org(uuid, uuid) from public, anon;
revoke all on function public.org_dashboard(uuid) from public, anon;
revoke all on function public.create_org_group(uuid, text, text, text, smallint, smallint, text, text) from public, anon;
grant execute on function public.attach_group_to_org(uuid, uuid) to authenticated;
grant execute on function public.org_dashboard(uuid) to authenticated;
grant execute on function public.create_org_group(uuid, text, text, text, smallint, smallint, text, text) to authenticated;
