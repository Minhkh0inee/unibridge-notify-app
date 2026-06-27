import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// For Node.js environment (SSR), provide ws transport
let realtimeConfig = {};
if (typeof window === 'undefined') {
  try {
    const WebSocket = require('ws');
    realtimeConfig = { transport: WebSocket };
  } catch (e) {
    console.warn('ws package not available, realtime features may not work in SSR');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: realtimeConfig,
});
