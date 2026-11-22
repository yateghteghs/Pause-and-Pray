/**
 * Gate rules shared by the app and (mirrored in Kotlin and Swift) by the
 * native blockers in modules/app-gate. Keep them in step with this file.
 *
 *  1. A prayer time that has come round and not been prayed pauses the chosen
 *     apps until "I've prayed", in every mode. There is no time limit and no skip.
 *  2. "Every open" mode also pauses the apps each time they are opened; there,
 *     "I've prayed" or "Skip for now" opens them for 15, 30 or 60 minutes.
 */
import { duePrayer, PrayerTime } from './schedule';

export type GateMode = 'every-open' | 'prayer-times';
export type UnlockMinutes = 15 | 30 | 60;

export interface GateConfig {
  /** Android package names, or on iOS a marker that a FamilyActivitySelection exists. */
  gatedApps: string[];
  mode: GateMode;
  unlockMinutes: UnlockMinutes;
  schedule: PrayerTime[];
  /** Epoch ms of the last "I've prayed" (settles every prayer time due before it). */
  lastPrayedAt: number;
  /** Every-open mode: packageName -> epoch ms until which the app is open. */
  unlockedUntil: Record<string, number>;
}

export function shouldGate(app: string, nowMs: number, cfg: GateConfig): boolean {
  if (!cfg.gatedApps.includes(app)) return false;
  if (duePrayer(cfg.schedule, nowMs, cfg.lastPrayedAt)) return true;
  if (cfg.mode === 'prayer-times') return false;
  return (cfg.unlockedUntil[app] ?? 0) <= nowMs;
}

/** "Skip for now" is only offered outside prayer times. */
export function canSkip(nowMs: number, cfg: Pick<GateConfig, 'schedule' | 'lastPrayedAt'>): boolean {
  return !duePrayer(cfg.schedule, nowMs, cfg.lastPrayedAt);
}

export function markPrayed(cfg: GateConfig, nowMs: number): GateConfig {
  return { ...cfg, lastPrayedAt: nowMs };
}

export function unlock(cfg: GateConfig, app: string, nowMs: number, minutes = cfg.unlockMinutes): GateConfig {
  return {
    ...cfg,
    unlockedUntil: { ...pruneExpired(cfg.unlockedUntil, nowMs), [app]: nowMs + minutes * 60_000 },
  };
}

export function pruneExpired(map: Record<string, number>, nowMs: number): Record<string, number> {
  return Object.fromEntries(Object.entries(map).filter(([, until]) => until > nowMs));
}
