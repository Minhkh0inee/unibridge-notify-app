import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

interface SupabaseStorage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

function createMemoryStorage(): SupabaseStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

// Environment validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please add it to your .env file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please add it to your .env file.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}. ` +
    'Must be a valid URL (e.g., https://your-project.supabase.co)'
  );
}

const isWebServerRender = Platform.OS === 'web' && typeof window === 'undefined';
const authStorage = isWebServerRender ? createMemoryStorage() : AsyncStorage;

// Create Supabase client with persistent storage on native/browser and memory storage during web SSR.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
