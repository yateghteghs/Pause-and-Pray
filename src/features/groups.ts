/**
 * Prayer groups on Supabase (see supabase/migrations/0002_prayer_groups.sql).
 *
 * Groups need an account. The server keeps, for each member, only the days on
 * which they prayed; never what they prayed for. Without a Supabase project,
 * the browser preview and development builds use a stand-in kept on this
 * device, with clearly marked sample members.
 */
import { currentStreak } from '../core/stats';
import { addDays, DayKey, dayKey, localDayKey, parseDayKey } from '../core/dates';
import { GroupDetail, GroupSummary, groupTimeToLocal, localTimeZone, makeInviteCode, normaliseCode } from '../core/groups';
import { PrayerTime } from '../core/schedule';
import { getJSON, setJSON } from '../storage/kv';
import { getState, removePrayerTime, setGroups, upsertGroupPrayerTime } from '../state/store';
import { accountsConfigured, previewAccounts, supabase } from './auth';

export const groupsAvailable = accountsConfigured || previewAccounts;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function myName(): string {
  const a = getState().account;
  return a?.name?.trim() || a?.email?.split('@')[0] || 'Me';
}

function friendly(message: string): string {
  if (/no group has that code/i.test(message)) return 'No group has that code. Check it with the person who invited you.';
  if (/sign in/i.test(message)) return 'Sign in to use prayer groups.';
  if (/network|fetch/i.test(message)) return 'No connection. Check your internet and try again.';
  return message;
}

// ------------------------------------------------------------------ group prayer times

/** Each group with a prayer time becomes a prayer time on this phone, in local time. */
export function syncGroupPrayerTimes(groups: GroupSummary[]) {
  const schedule = getState().gate.schedule;
  for (const t of schedule.filter((x) => x.kind === 'group')) {
    if (!groups.some((g) => `group-${g.id}` === t.id && g.hour !== undefined)) removePrayerTime(t.id);
  }
  for (const g of groups) {
    if (g.hour === undefined || g.minute === undefined) continue;
    const local = groupTimeToLocal(g.hour, g.minute, g.timezone ?? localTimeZone());
    const existing = schedule.find((t) => t.id === `group-${g.id}`);
    const time: PrayerTime = {
      id: `group-${g.id}`,
      kind: 'group',
      label: g.name,
      hour: local.hour,
      minute: local.minute,
      enabled: existing?.enabled ?? true,
      since: existing?.since ?? Date.now(),
      groupId: g.id,
    };
    if (!existing || existing.hour !== time.hour || existing.minute !== time.minute || existing.label !== time.label) {
      upsertGroupPrayerTime(time);
    }
  }
}

/** If the user already prayed today, a group they just joined or started counts it. */
async function shareTodayIfPrayed() {
  const today = localDayKey(new Date());
  if (getState().events.some((e) => e.outcome === 'prayed' && localDayKey(new Date(e.at)) === today)) {
    await recordGroupPrayer();
  }
}

function store(groups: GroupSummary[]) {
  setGroups(groups);
  syncGroupPrayerTimes(groups);
}

// ------------------------------------------------------------------ preview stand-in

interface DemoMember {
  name: string;
  me?: boolean;
  days: DayKey[];
}
interface DemoGroup extends GroupSummary {
  members: DemoMember[];
}
const DEMO_KEY = 'pause-and-pray/preview-groups/v1';
export const DEMO_CODE = 'MONICA';

function sampleGroup(): DemoGroup {
  const today = parseDayKey(localDayKey(new Date()));
  const days = (n: number, skip: number[] = []) =>
    Array.from({ length: n }, (_, i) => i).filter((i) => !skip.includes(i)).map((i) => dayKey(addDays(today, -i)));
  return {
    id: 'demo-monica',
    name: 'St. Monica Youth Group (sample)',
    code: DEMO_CODE,
    intention: 'Our families, and young people far from the faith',
    hour: 20,
    minute: 0,
    timezone: localTimeZone(),
    role: 'member',
    members: [
      { name: 'Sample member: Chiamaka', days: days(12) },
      { name: 'Sample member: Joseph', days: days(9, [0]) },
      { name: 'Sample member: Teresa', days: days(20, [3]) },
      { name: 'Sample member: Daniel', days: days(4, [0, 1]) },
    ],
  };
}

const demo = {
  load: () => getJSON<DemoGroup[]>(DEMO_KEY, []),
  save: (g: DemoGroup[]) => setJSON(DEMO_KEY, g),
  summary: ({ members: _m, ...g }: DemoGroup): GroupSummary => g,
};

// ------------------------------------------------------------------ API

export async function refreshGroups(): Promise<Result<GroupSummary[]>> {
  if (!groupsAvailable || !getState().account) {
    if (getState().groups.length) store([]); // signed out: drop groups and their prayer times
    return { ok: true, value: [] };
  }
  if (!accountsConfigured) {
    const list = demo.load().map(demo.summary);
    store(list);
    return { ok: true, value: list };
  }
  const { data, error } = await supabase()
    .from('prayer_group_members')
    .select('role, prayer_groups (id, name, invite_code, intention, prayer_hour, prayer_minute, timezone)');
  if (error) return { ok: false, error: friendly(error.message) };
  const list: GroupSummary[] = (data ?? []).flatMap((row: any) => {
    const g = row.prayer_groups;
    if (!g) return [];
    return [{
      id: g.id,
      name: g.name,
      code: g.invite_code,
      intention: g.intention ?? undefined,
      hour: g.prayer_hour ?? undefined,
      minute: g.prayer_minute ?? undefined,
      timezone: g.timezone ?? undefined,
      role: row.role,
    }];
  });
  store(list);
  return { ok: true, value: list };
}

export interface NewGroup {
  name: string;
  intention?: string;
  hour?: number;
  minute?: number;
}

export async function createGroup(input: NewGroup): Promise<Result<GroupSummary>> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Give the group a name of at least 2 letters.' };
  const timezone = localTimeZone();
  if (!accountsConfigured) {
    const g: DemoGroup = {
      id: `demo-${Date.now()}`,
      name,
      code: makeInviteCode(),
      intention: input.intention?.trim() || undefined,
      hour: input.hour,
      minute: input.minute,
      timezone,
      role: 'admin',
      members: [{ name: myName(), me: true, days: [] }],
    };
    demo.save([...demo.load(), g]);
    await refreshGroups();
    await shareTodayIfPrayed();
    return { ok: true, value: demo.summary(g) };
  }
  const { data, error } = await supabase().rpc('create_prayer_group', {
    p_name: name,
    p_display_name: myName(),
    p_intention: input.intention ?? null,
    p_hour: input.hour ?? null,
    p_minute: input.minute ?? null,
    p_timezone: timezone,
  });
  if (error || !data) return { ok: false, error: friendly(error?.message ?? 'Could not create the group.') };
  const list = await refreshGroups();
  await shareTodayIfPrayed();
  const created = list.ok ? list.value.find((x) => x.id === data.id) : undefined;
  return created ? { ok: true, value: created } : { ok: false, error: 'The group was created; pull down to refresh.' };
}

export async function joinGroup(codeInput: string): Promise<Result<GroupSummary>> {
  const code = normaliseCode(codeInput);
  if (code.length !== 6) return { ok: false, error: 'Invite codes have 6 letters and numbers, like PRAY7K.' };
  if (!accountsConfigured) {
    const groups = demo.load();
    const already = groups.find((g) => g.code === code);
    if (already) return { ok: true, value: demo.summary(already) };
    if (code !== DEMO_CODE) return { ok: false, error: `No group has that code. In this preview, try ${DEMO_CODE}.` };
    const g = sampleGroup();
    g.members.unshift({ name: myName(), me: true, days: [] });
    demo.save([...groups, g]);
    await refreshGroups();
    await shareTodayIfPrayed();
    return { ok: true, value: demo.summary(g) };
  }
  const { data, error } = await supabase().rpc('join_prayer_group', { p_code: code, p_display_name: myName() });
  if (error || !data) return { ok: false, error: friendly(error?.message ?? 'Could not join the group.') };
  const list = await refreshGroups();
  await shareTodayIfPrayed();
  const joined = list.ok ? list.value.find((x) => x.id === data.id) : undefined;
  return joined ? { ok: true, value: joined } : { ok: false, error: 'You joined; pull down to refresh.' };
}

export async function leaveGroup(id: string): Promise<Result<null>> {
  if (!accountsConfigured) {
    demo.save(demo.load().filter((g) => g.id !== id));
  } else {
    const { data: auth } = await supabase().auth.getUser();
    const { error } = await supabase().from('prayer_group_members').delete().eq('group_id', id).eq('user_id', auth.user?.id ?? '');
    if (error) return { ok: false, error: friendly(error.message) };
  }
  await refreshGroups();
  return { ok: true, value: null };
}

export async function updateGroup(id: string, patch: { intention?: string; hour?: number | null; minute?: number | null }): Promise<Result<null>> {
  if (!accountsConfigured) {
    demo.save(
      demo.load().map((g) =>
        g.id === id
          ? {
              ...g,
              intention: patch.intention?.trim() || undefined,
              hour: patch.hour ?? undefined,
              minute: patch.minute ?? undefined,
              timezone: localTimeZone(),
            }
          : g,
      ),
    );
  } else {
    const { error } = await supabase()
      .from('prayer_groups')
      .update({
        intention: patch.intention?.trim() || null,
        prayer_hour: patch.hour ?? null,
        prayer_minute: patch.minute ?? null,
        timezone: localTimeZone(),
      })
      .eq('id', id);
    if (error) return { ok: false, error: friendly(error.message) };
  }
  await refreshGroups();
  return { ok: true, value: null };
}

export async function getGroup(id: string): Promise<Result<GroupDetail>> {
  const today = localDayKey(new Date());
  if (!accountsConfigured) {
    const g = demo.load().find((x) => x.id === id);
    if (!g) return { ok: false, error: 'This group is no longer on this device.' };
    const allDays = new Set(g.members.flatMap((m) => m.days));
    return {
      ok: true,
      value: {
        ...demo.summary(g),
        members: g.members.map((m) => ({ name: m.name, isMe: Boolean(m.me), prayedToday: m.days.includes(today) })),
        streak: currentStreak(allDays, new Date()),
      },
    };
  }
  const since = dayKey(addDays(parseDayKey(today), -60));
  const [{ data: auth }, members, days] = await Promise.all([
    supabase().auth.getUser(),
    supabase().from('prayer_group_members').select('user_id, display_name, role').eq('group_id', id),
    supabase().from('prayer_group_days').select('user_id, prayed_on').eq('group_id', id).gte('prayed_on', since),
  ]);
  if (members.error || days.error) return { ok: false, error: friendly((members.error ?? days.error)!.message) };
  const summary = getState().groups.find((g) => g.id === id);
  if (!summary) return { ok: false, error: 'You are not a member of this group.' };
  const me = auth.user?.id;
  const prayedToday = new Set((days.data ?? []).filter((d) => d.prayed_on === today).map((d) => d.user_id));
  return {
    ok: true,
    value: {
      ...summary,
      members: (members.data ?? []).map((m) => ({ name: m.display_name, isMe: m.user_id === me, prayedToday: prayedToday.has(m.user_id) })),
      streak: currentStreak(new Set((days.data ?? []).map((d) => d.prayed_on)), new Date()),
    },
  };
}

/** After "I've prayed": tell each of the user's groups that they prayed today (one row per day). */
export async function recordGroupPrayer(): Promise<void> {
  const groups = getState().groups;
  if (!groups.length || !getState().account) return;
  const today = localDayKey(new Date());
  if (!accountsConfigured) {
    demo.save(
      demo.load().map((g) => ({
        ...g,
        members: g.members.map((m) => (m.me && !m.days.includes(today) ? { ...m, days: [today, ...m.days] } : m)),
      })),
    );
    return;
  }
  const { data: auth } = await supabase().auth.getUser();
  if (!auth.user) return;
  await supabase()
    .from('prayer_group_days')
    .upsert(groups.map((g) => ({ group_id: g.id, user_id: auth.user!.id, prayed_on: today })), { ignoreDuplicates: true });
}
