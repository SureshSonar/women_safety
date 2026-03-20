// ============================================
// Supabase Client Configuration
// SafeHer - Women Safety App
// ============================================

import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_ANON_KEY.includes('your-anon-key')
);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log('✅ Supabase Realtime client initialized');
  } catch (err) {
    console.warn('⚠️ Supabase client initialization failed:', err);
  }
} else {
  console.info('ℹ️ Supabase not configured — using localStorage fallback for live tracking');
}

// Create a dummy client that no-ops for unconfigured state
const dummyClient = {
  channel: () => ({
    on: function() { return this; },
    subscribe: (cb) => { if (cb) cb('CLOSED'); return { unsubscribe: () => {} }; },
    send: () => Promise.resolve(),
    unsubscribe: () => {},
  }),
  removeChannel: () => {},
};

export const supabase = supabaseInstance || dummyClient;
export default supabase;
