/**
 * Simple storage abstraction for the mobile app.
 * Uses a try/catch around AsyncStorage import with a memory fallback.
 * This avoids build failures if AsyncStorage isn't properly installed.
 */

let storageBackend: any = null;
const memoryStore: Record<string, string> = {};

async function getBackend() {
  if (storageBackend) return storageBackend;
  try {
    const mod = require('@react-native-async-storage/async-storage');
    storageBackend = mod.default || mod;
    return storageBackend;
  } catch {
    // Fallback to memory store
    storageBackend = {
      getItem: async (key: string) => memoryStore[key] ?? null,
      setItem: async (key: string, value: string) => { memoryStore[key] = value; },
      removeItem: async (key: string) => { delete memoryStore[key]; },
      multiRemove: async (keys: string[]) => { keys.forEach((k) => delete memoryStore[k]); },
    };
    return storageBackend;
  }
}

const Storage = {
  async getItem(key: string): Promise<string | null> {
    const backend = await getBackend();
    return backend.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const backend = await getBackend();
    return backend.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const backend = await getBackend();
    return backend.removeItem(key);
  },
  async multiRemove(keys: string[]): Promise<void> {
    const backend = await getBackend();
    if (backend.multiRemove) {
      return backend.multiRemove(keys);
    }
    await Promise.all(keys.map((k) => backend.removeItem(k)));
  },
};

export default Storage;
