import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const storage = createMMKV({ id: 'pulsar' });

/** Zustand's persist adapter over MMKV. Every durable UI pref goes through this. */
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};
