/**
 * Browser preview storage: localStorage, falling back to memory when the
 * browser blocks it (private windows, sandboxed previews).
 */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = read(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // memory only
  }
}

export function remove(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // memory only
  }
}
