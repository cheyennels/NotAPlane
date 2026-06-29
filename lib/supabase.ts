import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore values are capped at 2048 bytes; auth tokens can exceed that, so
// we split values across numbered chunks and keep a count at the base key.
const SECURE_CHUNK_SIZE = 2000;

async function secureChunkCount(key: string): Promise<number> {
  const meta = await SecureStore.getItemAsync(key);
  const n = meta ? parseInt(meta, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

const secureStoreAdapter: SupportedStorage = {
  getItem: async (key) => {
    const count = await secureChunkCount(key);
    if (count === 0) return null;
    let value = "";
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part == null) return null;
      value += part;
    }
    return value;
  },
  setItem: async (key, value) => {
    const previous = await secureChunkCount(key);
    for (let i = 0; i < previous; i++) {
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    }
    const chunks = Math.max(1, Math.ceil(value.length / SECURE_CHUNK_SIZE));
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * SECURE_CHUNK_SIZE, (i + 1) * SECURE_CHUNK_SIZE),
      );
    }
    await SecureStore.setItemAsync(key, String(chunks));
  },
  removeItem: async (key) => {
    const count = await secureChunkCount(key);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

function createAuthStorage(): SupportedStorage {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };
    }
    return {
      getItem: (key) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key, value) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key) => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }
  // Native: hardware-backed encrypted storage (iOS Keychain / Android Keystore).
  return secureStoreAdapter;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
