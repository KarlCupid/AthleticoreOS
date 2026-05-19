import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import {
  createReadyAthleteJourneyAppEntryState,
  type AthleteJourneyAppEntryState,
} from './athleteJourneyService';

export type DevAuthAccountKey = 'ready_athlete' | 'onboarding_athlete';

export interface DevAuthAccount {
  key: DevAuthAccountKey;
  label: string;
  detail: string;
  email: string;
  userId: string;
  entryStatus: AthleteJourneyAppEntryState['status'];
}

type DevAuthListener = (account: DevAuthAccount | null) => void;

const DEV_AUTH_STORAGE_KEY = '@athleticore/dev-auth-account';
const DEV_AUTH_PROVIDER = 'athleticore_dev';

export const DEV_AUTH_ACCOUNTS: readonly DevAuthAccount[] = [
  {
    key: 'ready_athlete',
    label: 'Athlete',
    detail: 'Ready profile',
    email: 'ready-athlete@dev.athleticore.local',
    userId: '00000000-0000-4000-8000-000000000101',
    entryStatus: 'ready',
  },
  {
    key: 'onboarding_athlete',
    label: 'New athlete',
    detail: 'Needs onboarding',
    email: 'new-athlete@dev.athleticore.local',
    userId: '00000000-0000-4000-8000-000000000102',
    entryStatus: 'needs_onboarding',
  },
];

const listeners = new Set<DevAuthListener>();
let activeAccount: DevAuthAccount | null = null;

export function getDevAuthAccount(key: DevAuthAccountKey | null | undefined): DevAuthAccount | null {
  return DEV_AUTH_ACCOUNTS.find((account) => account.key === key) ?? null;
}

export function getActiveDevAuthAccountSnapshot(): DevAuthAccount | null {
  return activeAccount;
}

export function getActiveDevAuthSessionSnapshot(): Session | null {
  return activeAccount ? createDevAuthSession(activeAccount) : null;
}

export function isDevAuthUserId(userId: string | null | undefined): boolean {
  return DEV_AUTH_ACCOUNTS.some((account) => account.userId === userId);
}

export function subscribeDevAuthAccountChanges(listener: DevAuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyDevAuthListeners(): void {
  listeners.forEach((listener) => listener(activeAccount));
}

function setActiveDevAuthAccount(account: DevAuthAccount | null): void {
  activeAccount = account;
  notifyDevAuthListeners();
}

export async function hydratePersistedDevAuthAccount(): Promise<DevAuthAccount | null> {
  const storedKey = await AsyncStorage.getItem(DEV_AUTH_STORAGE_KEY);
  const account = getDevAuthAccount(storedKey as DevAuthAccountKey | null);
  setActiveDevAuthAccount(account);
  return account;
}

export async function activateDevAuthAccount(key: DevAuthAccountKey): Promise<DevAuthAccount> {
  const account = getDevAuthAccount(key);
  if (!account) {
    throw new Error('Unsupported developer account.');
  }

  await AsyncStorage.setItem(DEV_AUTH_STORAGE_KEY, account.key);
  setActiveDevAuthAccount(account);
  return account;
}

export async function clearActiveDevAuthAccount(): Promise<void> {
  await AsyncStorage.removeItem(DEV_AUTH_STORAGE_KEY);
  setActiveDevAuthAccount(null);
}

export function createDevAuthSession(account: DevAuthAccount): Session {
  const createdAt = '2026-01-01T00:00:00.000Z';
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const user: User = {
    id: account.userId,
    app_metadata: {
      provider: DEV_AUTH_PROVIDER,
      providers: [DEV_AUTH_PROVIDER],
      dev_auth: true,
    },
    user_metadata: {
      email: account.email,
      first_name: account.key === 'ready_athlete' ? 'Ready' : 'New',
      full_name: account.label,
    },
    aud: 'authenticated',
    email: account.email,
    created_at: createdAt,
    confirmed_at: createdAt,
    email_confirmed_at: createdAt,
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    is_anonymous: false,
  };

  return {
    access_token: `dev-access-token-${account.key}`,
    refresh_token: `dev-refresh-token-${account.key}`,
    expires_in: 60 * 60 * 24 * 365,
    expires_at: expiresAt,
    token_type: 'bearer',
    user,
  };
}

export function createDevAuthEntryState(account: DevAuthAccount): AthleteJourneyAppEntryState {
  if (account.entryStatus === 'ready') {
    return createReadyAthleteJourneyAppEntryState();
  }

  return {
    status: 'needs_onboarding',
    hasProfile: false,
    needsTrainingSetup: false,
    journey: null,
    performanceState: null,
  };
}
