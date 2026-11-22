/**
 * Prayer groups: shared types and pure helpers (time zones, codes).
 * Server access lives in src/features/groups.ts.
 */

export type GroupDevotion = 'intentions' | 'angelus' | 'divine-mercy' | 'rosary-decade';

export const DEVOTION_LABELS: Record<GroupDevotion, string> = {
  intentions: 'Prayers for our intentions',
  angelus: 'The Angelus',
  'divine-mercy': 'Divine Mercy prayer',
  'rosary-decade': 'A decade of the Rosary',
};

export interface Announcement {
  id: string;
  body: string;
  at: number;
}

export interface OrgDashboardRow {
  groupId: string;
  groupName: string;
  members: number;
  prayedToday: number;
  /** Share of member-days with prayer, 0-1. */
  rate7d: number;
  rate30d: number;
}

export interface Organization {
  id: string;
  name: string;
  kind: 'parish' | 'school' | 'chaplaincy' | 'association' | 'other';
  activeUntil?: number;
}

export interface GroupSummary {
  id: string;
  name: string;
  /** Invite code members type to join, e.g. "PRAY7K". */
  code: string;
  intention?: string;
  /** The group's shared prayer time, in the group's own time zone. */
  hour?: number;
  minute?: number;
  timezone?: string;
  role: 'admin' | 'member';
  /** Parish plan: the organisation the group belongs to. */
  orgId?: string;
  orgName?: string;
  /** True while the organisation's parish plan is paid. */
  orgActive?: boolean;
  devotion?: GroupDevotion;
}

export interface GroupMemberToday {
  name: string;
  prayedToday: boolean;
  isMe: boolean;
}

export interface GroupDetail extends GroupSummary {
  members: GroupMemberToday[];
  /** Consecutive days (ending today or yesterday) on which at least one member prayed. */
  streak: number;
  announcements: Announcement[];
  /** Members allowed: a number for free groups, null with a parish plan. */
  memberLimit: number | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

export function makeInviteCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');
}

export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Minutes the time zone is ahead of UTC at a given moment. */
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * A group's prayer time (hour:minute in its own zone) as the member's local
 * hour and minute today, so members in other countries pray at the same moment.
 */
export function groupTimeToLocal(hour: number, minute: number, timeZone: string, now: Date = new Date()): { hour: number; minute: number } {
  let offset: number;
  try {
    offset = zoneOffsetMinutes(timeZone, now);
  } catch {
    return { hour, minute }; // unknown zone: treat as local
  }
  const zoned = new Date(now.getTime() + offset * 60000);
  const epoch = Date.UTC(zoned.getUTCFullYear(), zoned.getUTCMonth(), zoned.getUTCDate(), hour, minute) - offset * 60000;
  const local = new Date(epoch);
  return { hour: local.getHours(), minute: local.getMinutes() };
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
