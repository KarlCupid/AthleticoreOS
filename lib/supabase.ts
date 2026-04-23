import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { logWarn } from './utils/logger';

function getRequiredEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Add it to your Expo env configuration.`);
  }

  return value;
}

const supabaseUrl = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

supabase.auth.getSession = (async (...args: Parameters<typeof originalGetSession>) => {
  try {
    return await originalGetSession(...args);
  } catch (error) {
    logWarn('supabase.auth.getSession', error);
    return {
      data: { session: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof originalGetSession>>;
  }
}) as typeof supabase.auth.getSession;

supabase.auth.getUser = (async (...args: Parameters<typeof originalGetUser>) => {
  try {
    return await originalGetUser(...args);
  } catch (error) {
    logWarn('supabase.auth.getUser', error);
    return {
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof originalGetUser>>;
  }
}) as typeof supabase.auth.getUser;

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
