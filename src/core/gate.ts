/**
 * Gate rules shared by the app and (mirrored in Kotlin/Swift) by the native
 * blockers. Keep src/native/*.kt / ios logic in step with this file.
 */
import { activeWindow, PrayerTime } from './schedule';

export type GateMode = 'every-open' | 'prayer-times';
export type UnlockMinutes = 15 | 30 | 60;

export interface GateConfig {
  /** Android package names, or on iOS a marker that a FamilyActivitySelection exists. */
  gatedApps: string[];
  mode: GateMode;
  unlockMinutes: UnlockMinutes;
  schedule: PrayerTime[];
  /** packageName -> epoch ms until which the app is unlocked. */
  unlockedUntil: Record<string, number>;
}

export function shouldGate(app: string, nowMs: number, cfg: GateConfig): boolean {
  if (!cfg.gatedApps.includes(app)) return false;
  if ((cfg.unlockedUntil[app] ?? 0) > nowMs) return false;
  if (cfg.mode === 'every-open') return true;
  return activeWindow(cfg.schedule, new Date(nowMs)) !== undefined;
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
