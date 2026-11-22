-- Plan tiers (prices and limits from src/core/pricing.ts; keep them in step,
-- src/core/__tests__/pricing-sql.test.ts checks the numbers below):
--   group      ₦4,000 / year   1 group,          50 members in total
--   parish     ₦7,500 / year   up to 10 groups, 300 members in total
--   community  ₦10,000 / year  no limits

alter table public.organizations
  add column tier text not null default 'parish' check (tier in ('group', 'parish', 'community'));
alter table public.plan_requests
  add column tier text not null default 'parish' check (tier in ('group', 'parish', 'community'));

create or replace function public.tier_max_groups(p_tier text) returns integer
language sql immutable as $$
  select case p_tier when 'group' then 1 when 'parish' then 10 else null end;
$$;

create or replace function public.tier_max_members(p_tier text) returns integer
language sql immutable as $$
  select case p_tier when 'group' then 50 when 'parish' then 300 else null end;
$$;

-- Members across all the organisation's groups.
create or replace function public.org_member_count(p_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.prayer_group_members m
  join public.prayer_groups g on g.id = m.group_id where g.org_id = p_org;
$$;

create or replace function public.org_group_count(p_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.prayer_groups g where g.org_id = p_org;
$$;

create or replace function public.org_tier(p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select o.tier from public.organizations o where o.id = p_org;
$$;

-- Joining: free groups up to 15; plan groups up to their tier's member total.
create or replace function public.join_prayer_group(p_code text, p_display_name text) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
  members integer;
  cap integer;
begin
  if auth.uid() is null then raise exception 'Sign in to join a group'; end if;
  select * into g from public.prayer_groups where invite_code = upper(trim(p_code));
  if not found then raise exception 'No group has that code'; end if;
  if exists (select 1 from public.prayer_group_members m where m.group_id = g.id and m.user_id = auth.uid()) then
    return g;
  end if;
  if public.org_plan_active(g.org_id) then
    cap := public.tier_max_members(public.org_tier(g.org_id));
    if cap is not null and public.org_member_count(g.org_id) >= cap then raise exception 'This plan is full'; end if;
  else
    select count(*) into members from public.prayer_group_members m where m.group_id = g.id;
    if members >= 15 then raise exception 'This group is full'; end if;
  end if;
  insert into public.prayer_group_members (group_id, user_id, display_name) values (g.id, auth.uid(), trim(p_display_name));
  return g;
end;
$$;

create or replace function public.create_org_group(
  p_org uuid, p_name text, p_display_name text, p_intention text default null,
  p_hour smallint default null, p_minute smallint default null, p_timezone text default null,
  p_devotion text default 'intentions'
) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
  cap integer;
begin
  if not public.is_org_admin(p_org) then raise exception 'Only organisation leaders can do this'; end if;
  cap := public.tier_max_groups(public.org_tier(p_org));
  if cap is not null and public.org_group_count(p_org) >= cap then raise exception 'Your plan has reached its group limit'; end if;
  g := public.create_prayer_group(p_name, p_display_name, p_intention, p_hour, p_minute, p_timezone);
  update public.prayer_groups set org_id = p_org, devotion = coalesce(p_devotion, 'intentions') where id = g.id returning * into g;
  return g;
end;
$$;

create or replace function public.attach_group_to_org(p_group uuid, p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  max_groups integer := public.tier_max_groups(public.org_tier(p_org));
  max_members integer := public.tier_max_members(public.org_tier(p_org));
  incoming integer;
begin
  if not public.is_group_admin(p_group) or not public.is_org_admin(p_org) then
    raise exception 'Only a leader of both the group and the organisation can do this';
  end if;
  select count(*) into incoming from public.prayer_group_members m where m.group_id = p_group;
  if max_groups is not null and public.org_group_count(p_org) >= max_groups then
    raise exception 'Your plan has reached its group limit';
  end if;
  if max_members is not null and public.org_member_count(p_org) + incoming > max_members then
    raise exception 'This plan is full';
  end if;
  update public.prayer_groups set org_id = p_org where id = p_group;
end;
$$;

-- Activation now copies the requested tier.
create or replace function public.activate_parish_plan(p_request uuid, p_until date) returns public.organizations
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests;
  o public.organizations;
begin
  select * into r from public.plan_requests where id = p_request;
  if not found then raise exception 'No such request'; end if;
  insert into public.organizations (name, kind, tier, plan_active_until) values (r.org_name, r.org_kind, r.tier, p_until)
  returning * into o;
  insert into public.organization_admins (org_id, user_id) values (o.id, r.user_id);
  update public.plan_requests set status = 'active' where id = p_request;
  return o;
end;
$$;

revoke all on function public.activate_parish_plan(uuid, date) from public, anon, authenticated;
revoke all on function public.org_member_count(uuid) from public, anon;
revoke all on function public.org_group_count(uuid) from public, anon;
revoke all on function public.org_tier(uuid) from public, anon;
