import { useSyncExternalStore } from 'react';
import * as AppGate from '../../modules/app-gate';
import { GateConfig, GateMode, UnlockMinutes } from '../core/gate';
import { DEFAULT_SCHEDULE, PrayerTime } from '../core/schedule';
import { PauseEvent } from '../core/stats';
import { getJSON, setJSON, remove } from '../storage/kv';

export interface AppState {
  onboarded: boolean;
  /** National calendar layered on the universal one. */
  country: 'NG';
  remindersEnabled: boolean;
  gate: Omit<GateConfig, 'unlockedUntil'>;
  /** Android: labels for the gated packages, for display only. */
  appLabels: Record<string, string>;
  events: PauseEvent[];
  pauseCounter: number;
}

const KEY = 'pause-and-pray/state/v1';
const MAX_EVENTS = 5000;

const DEFAULT_STATE: AppState = {
  onboarded: false,
  country: 'NG',
  remindersEnabled: true,
  gate: { gatedApps: [], mode: 'every-open', unlockMinutes: 15, schedule: DEFAULT_SCHEDULE },
  appLabels: {},
  events: [],
  pauseCounter: 0,
};

let state: AppState = load();
const listeners = new Set<() => void>();

function load(): AppState {
  const saved = getJSON<Partial<AppState>>(KEY, {});
  return {
    ...DEFAULT_STATE,
    ...saved,
    gate: { ...DEFAULT_STATE.gate, ...saved.gate },
  };
}

function commit(next: AppState, syncNative = false) {
  state = next;
  setJSON(KEY, state);
  if (syncNative) pushConfigToNative();
  listeners.forEach((l) => l());
}

export function pushConfigToNative() {
  AppGate.setConfig({
    gatedApps: state.gate.gatedApps,
    mode: state.gate.mode,
    unlockMinutes: state.gate.unlockMinutes,
    schedule: state.gate.schedule.map(({ id, hour, minute, enabled, windowMinutes }) => ({
      id, hour, minute, enabled, windowMinutes,
    })),
  });
}

export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// ------------------------------------------------------------------ actions

export function completeOnboarding() {
  commit({ ...state, onboarded: true }, true);
}

export function setGatedApps(apps: string[], labels: Record<string, string> = {}) {
  commit({ ...state, gate: { ...state.gate, gatedApps: apps }, appLabels: { ...state.appLabels, ...labels } }, true);
}

export function setGateMode(mode: GateMode) {
  commit({ ...state, gate: { ...state.gate, mode } }, true);
}

export function setUnlockMinutes(unlockMinutes: UnlockMinutes) {
  commit({ ...state, gate: { ...state.gate, unlockMinutes } }, true);
}

export function updatePrayerTime(id: PrayerTime['id'], patch: Partial<PrayerTime>) {
  const schedule = state.gate.schedule.map((t) => (t.id === id ? { ...t, ...patch } : t));
  commit({ ...state, gate: { ...state.gate, schedule } }, true);
}

export function setRemindersEnabled(remindersEnabled: boolean) {
  commit({ ...state, remindersEnabled });
}

export function nextPauseCounter(): number {
  const n = state.pauseCounter + 1;
  commit({ ...state, pauseCounter: n });
  return n;
}

export function recordPause(event: PauseEvent) {
  const events = [...state.events, event].slice(-MAX_EVENTS);
  commit({ ...state, events });
}

/** Merges pauses recorded outside the app (the iOS shield's "Skip for now"). */
export function importExtensionEvents() {
  const extra = AppGate.drainExtensionEvents();
  if (!extra.length) return;
  const events: PauseEvent[] = extra.map((e) => ({
    at: e.at,
    outcome: e.outcome === 'skipped' ? 'skipped' : 'prayed',
    prayerId: 'shield',
    app: 'shielded-app',
    seconds: 0,
  }));
  commit({ ...state, events: [...state.events, ...events].sort((a, b) => a.at - b.at).slice(-MAX_EVENTS) });
}

/** Deletes every record kept by the app (privacy: right to erasure). */
export function deleteAllData() {
  remove(KEY);
  commit({ ...DEFAULT_STATE }, true);
}
