/**
 * Small typed wrapper over expo-sqlite's key-value store. Everything stays on
 * the phone: no account, no server copy (see docs/PRIVACY.md).
 */
import Storage from 'expo-sqlite/kv-store';

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  Storage.setItemSync(key, JSON.stringify(value));
}

export function remove(key: string): void {
  Storage.removeItemSync(key);
}
