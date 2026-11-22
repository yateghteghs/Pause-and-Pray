/**
 * JS bridge to the native app gate. Returns safe fallbacks when the native
 * module is missing (Expo Go, web, unit tests) so the UI still runs.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export interface InstalledApp {
  packageName: string;
  label: string;
}

/** JSON written to native storage; mirrors GateConfig in src/core/gate.ts. */
export interface NativeGateConfig {
  gatedApps: string[];
  mode: 'every-open' | 'prayer-times';
  unlockMinutes: number;
  /** Prayer times; occurrences before `since` (epoch ms) do not count. */
  schedule: { id: string; hour: number; minute: number; enabled: boolean; since: number }[];
  /** Epoch ms of the last "I've prayed". */
  lastPrayedAt: number;
}

interface AppGateNative {
  // Shared
  setConfig(json: string): void;
  unlock(app: string, minutes: number): void;
  markPrayed(epochMs: number): void;
  // Android
  getInstalledApps?(): Promise<InstalledApp[]>;
  isAccessibilityServiceEnabled?(): boolean;
  openAccessibilitySettings?(): void;
  canDrawOverlays?(): boolean;
  openOverlaySettings?(): void;
  openApp?(packageName: string): boolean;
  // iOS
  requestAuthorization?(): Promise<boolean>;
  isAuthorized?(): boolean;
  presentAppPicker?(): Promise<number>;
  selectionCount?(): number;
  drainExtensionEvents?(): { at: number; outcome: string }[];
}

const native = requireOptionalNativeModule<AppGateNative>('AppGate');

export const isNativeGateAvailable = native != null;

export function setConfig(cfg: NativeGateConfig): void {
  native?.setConfig(JSON.stringify(cfg));
}

/** Lift the gate for `app` (Android package; ignored on iOS, which unlocks all shielded apps). */
export function unlock(app: string, minutes: number): void {
  native?.unlock(app, minutes);
}

/** "I've prayed": lifts the pause for every prayer time that is due. */
export function markPrayed(epochMs: number): void {
  native?.markPrayed(epochMs);
}

// ------------------------------------------------------------------ Android

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (Platform.OS !== 'android' || !native?.getInstalledApps) return [];
  const apps = await native.getInstalledApps();
  return apps.sort((a, b) => a.label.localeCompare(b.label));
}

export function isAccessibilityServiceEnabled(): boolean {
  return native?.isAccessibilityServiceEnabled?.() ?? false;
}

export function openAccessibilitySettings(): void {
  native?.openAccessibilitySettings?.();
}

export function canDrawOverlays(): boolean {
  return native?.canDrawOverlays?.() ?? false;
}

export function openOverlaySettings(): void {
  native?.openOverlaySettings?.();
}

/** Re-open the app the user was trying to reach. Returns false if it could not be launched. */
export function openApp(packageName: string): boolean {
  return native?.openApp?.(packageName) ?? false;
}

// ------------------------------------------------------------------ iOS

export async function requestScreenTimeAuthorization(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.requestAuthorization) return false;
  return native.requestAuthorization();
}

export function isScreenTimeAuthorized(): boolean {
  return native?.isAuthorized?.() ?? false;
}

/** Shows Apple's FamilyActivityPicker. Resolves to the number of apps/categories chosen. */
export async function presentAppPicker(): Promise<number> {
  if (Platform.OS !== 'ios' || !native?.presentAppPicker) return 0;
  return native.presentAppPicker();
}

export function iosSelectionCount(): number {
  return native?.selectionCount?.() ?? 0;
}

/** Outcomes recorded by the iOS shield extension (e.g. "Skip for now" tapped on the shield). */
export function drainExtensionEvents(): { at: number; outcome: string }[] {
  return native?.drainExtensionEvents?.() ?? [];
}
