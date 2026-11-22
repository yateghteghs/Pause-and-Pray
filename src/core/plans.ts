/**
 * What is free, what is in Plus (individuals) and what is in a parish plan (organisations).
 *
 * The mission stays free: prayer times that pause apps, intentions, daily
 * readings, saint of the day, the prayer library, stats and small groups.
 */

export type PlusFeature = 'rosary-guide' | 'chaplet-guide' | 'novena';

export const PLUS_FEATURES: { id: PlusFeature; title: string; detail: string }[] = [
  { id: 'rosary-guide', title: 'Guided Rosary', detail: 'Pray all five decades with the mysteries of the day and a bead counter.' },
  { id: 'chaplet-guide', title: 'Divine Mercy Chaplet', detail: 'Bead by bead, with every prayer on screen.' },
  { id: 'novena', title: 'Novenas', detail: 'Nine days of prayer for your intentions, with a reading for each day.' },
];

export const FREE_FOREVER = [
  'Prayer times that pause your apps until you pray',
  'Prayers for your three intentions',
  'Daily Mass readings and the saint of the day',
  'Prayer groups of up to 15 members',
];

/** Groups without a parish plan hold up to this many members (enforced by the server too). */
export const FREE_GROUP_MEMBER_LIMIT = 15;

export const PARISH_FEATURES = [
  'Bigger groups: from 50 members up to no limit, depending on the plan',
  'A leader dashboard: who is praying, by group, over 7 and 30 days',
  'Announcements to each group',
  'Choose the group devotion: intentions, Angelus, Divine Mercy or a Rosary decade',
  'Your parish or school name on every group',
];

export interface PlusStatus {
  active: boolean;
  /** Epoch ms when the current period ends, if known. */
  until?: number;
  /** 'store' = Google Play / App Store via RevenueCat; 'preview' = the browser preview stand-in. */
  source?: 'store' | 'preview';
}

export function hasPlus(status: PlusStatus | undefined, nowMs = Date.now()): boolean {
  if (!status?.active) return false;
  return status.until === undefined || status.until > nowMs;
}

export interface ParishPlan {
  /** Epoch ms until which the organisation's plan is paid. */
  activeUntil?: number;
  tier?: string;
}

export function parishActive(plan: ParishPlan | undefined, nowMs = Date.now()): boolean {
  return Boolean(plan?.activeUntil && plan.activeUntil > nowMs);
}

export function groupMemberLimit(orgPlan: ParishPlan | undefined, nowMs = Date.now()): number | null {
  return parishActive(orgPlan, nowMs) ? null : FREE_GROUP_MEMBER_LIMIT;
}
