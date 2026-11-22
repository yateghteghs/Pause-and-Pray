-- Prayer groups: members pray together, share an intention and a prayer time,
-- and see who in the group has prayed today.
--
-- Data minimisation: for each member the server keeps only the dates on which
-- they prayed (one row per day), never what they prayed for or how often.
-- Members agree to share this with their group when they join.

create table public.prayer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  invite_code text not null unique,
  intention text check (char_length(intention) <= 140),
  prayer_hour smallint check (prayer_hour between 0 and 23),
  prayer_minute smallint check (prayer_minute between 0 and 59),
  timezone text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.prayer_group_members (
  group_id uuid not null references public.prayer_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.prayer_group_days (
  group_id uuid not null references public.prayer_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prayed_on date not null, -- the member's own calendar day
  primary key (group_id, user_id, prayed_on)
);

alter table public.prayer_groups enable row level security;
alter table public.prayer_group_members enable row level security;
alter table public.prayer_group_days enable row level security;

-- Helpers run as the table owner so policies do not recurse into themselves.
create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prayer_group_members m where m.group_id = gid and m.user_id = auth.uid());
$$;

create or replace function public.is_group_admin(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prayer_group_members m where m.group_id = gid and m.user_id = auth.uid() and m.role = 'admin');
$$;

-- Groups: members can read; admins can change or delete. Creating and joining go through the functions below.
create policy "members read their groups" on public.prayer_groups for select to authenticated using (public.is_group_member(id));
create policy "admins update their groups" on public.prayer_groups for update to authenticated using (public.is_group_admin(id));
create policy "admins delete their groups" on public.prayer_groups for delete to authenticated using (public.is_group_admin(id));

-- Members: fellow members can see each other; you can rename or remove yourself; admins can remove members.
create policy "members see fellow members" on public.prayer_group_members for select to authenticated using (public.is_group_member(group_id));
create policy "members rename themselves" on public.prayer_group_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave or remove" on public.prayer_group_members for delete to authenticated using (user_id = auth.uid() or public.is_group_admin(group_id));

-- Prayer days: fellow members can see them; you can only add your own, in groups you belong to.
create policy "members see prayer days" on public.prayer_group_days for select to authenticated using (public.is_group_member(group_id));
create policy "record my own prayer day" on public.prayer_group_days for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create or replace function public.new_invite_code() returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O or 1/I/L
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.prayer_groups g where g.invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_prayer_group(
  p_name text, p_display_name text, p_intention text default null,
  p_hour smallint default null, p_minute smallint default null, p_timezone text default null
) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
begin
  if auth.uid() is null then raise exception 'Sign in to create a group'; end if;
  insert into public.prayer_groups (name, invite_code, intention, prayer_hour, prayer_minute, timezone, created_by)
  values (trim(p_name), public.new_invite_code(), nullif(trim(p_intention), ''), p_hour, p_minute, p_timezone, auth.uid())
  returning * into g;
  insert into public.prayer_group_members (group_id, user_id, display_name, role)
  values (g.id, auth.uid(), trim(p_display_name), 'admin');
  return g;
end;
$$;

create or replace function public.join_prayer_group(p_code text, p_display_name text) returns public.prayer_groups
language plpgsql security definer set search_path = '' as $$
declare
  g public.prayer_groups;
begin
  if auth.uid() is null then raise exception 'Sign in to join a group'; end if;
  select * into g from public.prayer_groups where invite_code = upper(trim(p_code));
  if not found then raise exception 'No group has that code'; end if;
  insert into public.prayer_group_members (group_id, user_id, display_name)
  values (g.id, auth.uid(), trim(p_display_name))
  on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

revoke all on function public.new_invite_code() from public, anon, authenticated;
revoke all on function public.create_prayer_group(text, text, text, smallint, smallint, text) from public, anon;
revoke all on function public.join_prayer_group(text, text) from public, anon;
grant execute on function public.create_prayer_group(text, text, text, smallint, smallint, text) to authenticated;
grant execute on function public.join_prayer_group(text, text) to authenticated;
