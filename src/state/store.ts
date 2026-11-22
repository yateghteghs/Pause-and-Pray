import { useSyncExternalStore } from 'react';
import * as AppGate from '../../modules/app-gate';
import { GateConfig, GateMode, UnlockMinutes } from '../core/gate';
import { defaultSchedule, isCurrentSchedule, newPersonalTime, PrayerTime } from '../core/schedule';
import { CountryCode, defaultCountry } from '../core/country';
import { PauseEvent } from '../core/stats';
import { getJSON, setJSON, remove } from '../storage/kv';
import type { Account } from '../features/auth';
import type { GroupSummary } from '../core/groups';
import type { PlusStatus } from '../core/plans';

export interface AppState {
  onboarded: boolean;
  /** Set once the user has signed up, signed in, or chosen to continue without an account. */
  accountChoice?: 'account' | 'guest';
  account: Account | null;
  /** Up to three things the user is praying for. Kept on the phone only. */
  intentions: string[];
  /** Prayer groups the user belongs to (needs an account). */
  groups: GroupSummary[];
  /** Pause & Pray Plus subscription, as last reported by the store. */
  plus: PlusStatus;
  /** Read aloud: speaking speed and language (recordings are matched to the language). */
  voice: { rate: 'slower' | 'normal'; language: string };
  /** Novena in progress: which one, when it started, and the calendar days (YYYY-MM-DD) it was prayed. */
  novena?: { id: string; startedOn: string; daysDone: string[] };
  /** National calendar layered on the General Roman Calendar ('universal' for none). */
  country: CountryCode;
  remindersEnabled: boolean;
  gate: Omit<GateConfig, 'unlockedUntil'>;
  /** Android: labels for the gated packages, for display only. */
  appLabels: Record<string, string>;
  events: PauseEvent[];
  pauseCounter: number;
}

const KEY = 'pause-and-pray/state/v1';
const MAX_EVENTS = 5000;

function defaultState(): AppState {
  return {
    onboarded: false,
    account: null,
    intentions: [],
    groups: [],
    plus: { active: false },
    voice: { rate: 'slower', language: 'en' },
    country: defaultCountry(),
    remindersEnabled: true,
    gate: { gatedApps: [], mode: 'prayer-times', unlockMinutes: 15, schedule: defaultSchedule(Date.now()), lastPrayedAt: 0 },
    appLabels: {},
    events: [],
    pauseCounter: 0,
  };
}

const DEFAULT_STATE: AppState = defaultState();

let state: AppState = load();
const listeners = new Set<() => void>();

function load(): AppState {
  const saved = getJSON<Partial<AppState>>(KEY, {});
  return {
    ...DEFAULT_STATE,
    ...saved,
    gate: {
      ...DEFAULT_STATE.gate,
      ...saved.gate,
      // Schedules saved before prayer times locked until prayed are replaced.
      schedule: isCurrentSchedule(saved.gate?.schedule) ? saved.gate.schedule : DEFAULT_STATE.gate.schedule,
    },
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
    schedule: state.gate.schedule.map(({ id, hour, minute, enabled, since }) => ({ id, hour, minute, enabled, since })),
    lastPrayedAt: state.gate.lastPrayedAt,
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

/** Changing a time or switching it on counts from now, so it does not lock the apps straight away. */
export function updatePrayerTime(id: PrayerTime['id'], patch: Partial<Omit<PrayerTime, 'since'>>) {
  const restart = patch.hour !== undefined || patch.minute !== undefined || patch.enabled === true;
  const schedule = state.gate.schedule.map((t) => (t.id === id ? { ...t, ...patch, ...(restart ? { since: Date.now() } : {}) } : t));
  commit({ ...state, gate: { ...state.gate, schedule } }, true);
}

export function addPrayerTime(hour: number, minute: number): PrayerTime {
  const time = newPersonalTime(state.gate.schedule, hour, minute, Date.now());
  commit({ ...state, gate: { ...state.gate, schedule: [...state.gate.schedule, time] } }, true);
  return time;
}

export function removePrayerTime(id: PrayerTime['id']) {
  commit({ ...state, gate: { ...state.gate, schedule: state.gate.schedule.filter((t) => t.id !== id) } }, true);
}

/** Adds or replaces the shared prayer time of a group. */
export function upsertGroupPrayerTime(time: PrayerTime) {
  const others = state.gate.schedule.filter((t) => t.id !== time.id);
  const existing = state.gate.schedule.find((t) => t.id === time.id);
  const moved = !existing || existing.hour !== time.hour || existing.minute !== time.minute;
  commit({ ...state, gate: { ...state.gate, schedule: [...others, { ...time, since: moved ? Date.now() : existing.since }] } }, true);
}

/** "I've prayed": settles every prayer time that is due. */
export function markPrayed(nowMs = Date.now()) {
  AppGate.markPrayed(nowMs);
  commit({ ...state, gate: { ...state.gate, lastPrayedAt: nowMs } }, true);
}

export function setPlus(plus: PlusStatus) {
  commit({ ...state, plus });
}

export function setVoice(voice: Partial<AppState['voice']>) {
  commit({ ...state, voice: { ...state.voice, ...voice } });
}

export function setNovena(novena: AppState['novena']) {
  commit({ ...state, novena });
}

export function setGroups(groups: GroupSummary[]) {
  commit({ ...state, groups });
}

/** Browser preview only: makes the first prayer time due now, to show what happens when it comes. */
export function previewPrayerTimeNow() {
  const nowMs = Date.now();
  const d = new Date(nowMs - 60_000);
  const schedule = state.gate.schedule.map((t, i, all) =>
    t.id === all.find((x) => x.kind === 'personal')?.id
      ? { ...t, hour: d.getHours(), minute: d.getMinutes(), enabled: true, since: nowMs - 120_000 }
      : t,
  );
  commit({ ...state, gate: { ...state.gate, schedule } }, true);
}

export function setCountry(country: CountryCode) {
  commit({ ...state, country });
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

export function setAccount(account: Account | null) {
  commit({ ...state, account, accountChoice: account ? 'account' : state.accountChoice });
}

export function continueAsGuest() {
  commit({ ...state, accountChoice: 'guest', account: null });
}

export function setIntentions(intentions: string[]) {
  commit({ ...state, intentions: intentions.map((i) => i.trim()).filter(Boolean).slice(0, 3) });
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
  commit(defaultState(), true);
}
