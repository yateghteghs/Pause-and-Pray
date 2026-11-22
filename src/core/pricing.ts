/**
 * Pause & Pray prices, in naira. The single source for the paywall, the
 * parish plan page, the server's member and group limits (0005_plan_tiers.sql)
 * and the prices you set in Google Play Console and App Store Connect.
 *
 * Rules (checked by src/core/__tests__/pricing.test.ts):
 *  - no paid option costs less than ₦400;
 *  - no plan costs more than ₦10,000 in a year.
 *
 * Outside Nigeria, set equivalent local prices in the stores (both can
 * suggest them from the naira price) and quote invoices in local currency.
 */

export const PRICE_RULES = { minNaira: 400, maxNairaPerYear: 10_000 } as const;

export type Period = 'month' | 'year';

export interface PlusPrice {
  /** Must match the product / package identifier in the stores and RevenueCat. */
  id: 'plus-monthly' | 'plus-yearly';
  title: string;
  naira: number;
  period: Period;
}

export const PLUS_PRICES: PlusPrice[] = [
  { id: 'plus-yearly', title: 'Yearly', naira: 3_500, period: 'year' },
  { id: 'plus-monthly', title: 'Monthly', naira: 400, period: 'month' },
];

export type ParishTierId = 'group' | 'parish' | 'community';

export interface ParishTier {
  id: ParishTierId;
  name: string;
  /** Who it is for, in a few words. */
  forWhom: string;
  naira: number; // per year
  /** null = no limit. */
  maxGroups: number | null;
  /** Members across all the organisation's groups; null = no limit. */
  maxMembers: number | null;
}

export const PARISH_TIERS: ParishTier[] = [
  { id: 'group', name: 'Group plan', forWhom: 'One youth group, society or class', naira: 4_000, maxGroups: 1, maxMembers: 50 },
  { id: 'parish', name: 'Parish plan', forWhom: 'A parish or school', naira: 7_500, maxGroups: 10, maxMembers: 300 },
  { id: 'community', name: 'Community plan', forWhom: 'Large parishes, schools, chaplaincies and dioceses', naira: 10_000, maxGroups: null, maxMembers: null },
];

export function tierById(id: string | undefined): ParishTier | undefined {
  return PARISH_TIERS.find((t) => t.id === id);
}

export function yearlyCost(naira: number, period: Period): number {
  return period === 'month' ? naira * 12 : naira;
}

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export function priceLabel(p: { naira: number; period: Period }): string {
  return `${formatNaira(p.naira)} / ${p.period}`;
}

/** "Save 27%" for the yearly Plus price against twelve months. */
export function yearlySaving(): number {
  const monthly = PLUS_PRICES.find((p) => p.period === 'month')!;
  const yearly = PLUS_PRICES.find((p) => p.period === 'year')!;
  return Math.round((1 - yearly.naira / (monthly.naira * 12)) * 100);
}

export function tierLimitsText(t: ParishTier): string {
  if (t.maxGroups === null) return 'Unlimited groups and members';
  return `${t.maxGroups === 1 ? '1 group' : `Up to ${t.maxGroups} groups`}, ${t.maxMembers} members in total`;
}
