// Session storage for Supabase Auth in the browser.
const memory = new Map<string, string>();
const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // memory only
    }
  },
  async removeItem(key: string): Promise<void> {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // memory only
    }
  },
};
export default Storage;
