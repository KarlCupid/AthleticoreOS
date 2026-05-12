import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarn } from '../utils/logger';
import {
  createReadyAthleteJourneyAppEntryState,
  type AthleteJourneyAppEntryState,
} from './athleteJourneyService';

const JOURNEY_ENTRY_CACHE_VERSION = 2;
const JOURNEY_ENTRY_CACHE_PREFIX = 'athleticore:journey-entry:';

function journeyEntryCacheKey(userId: string): string {
  return `${JOURNEY_ENTRY_CACHE_PREFIX}${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function readReadyAthleteJourneyEntryCache(userId: string): Promise<AthleteJourneyAppEntryState | null> {
  try {
    const rawCache = await AsyncStorage.getItem(journeyEntryCacheKey(userId));
    if (!rawCache) return null;

    const parsed = JSON.parse(rawCache) as unknown;
    if (!isRecord(parsed) || parsed.version !== JOURNEY_ENTRY_CACHE_VERSION || parsed.userId !== userId) {
      return null;
    }

    const state = parsed.state;
    if (!isRecord(state) || state.status !== 'ready' || state.hasProfile !== true) {
      return null;
    }

    return createReadyAthleteJourneyAppEntryState();
  } catch (error) {
    logWarn('athleteJourneyEntryCache.readReady', error, { journeyOperation: 'readReadyEntryCache' });
    return null;
  }
}

export async function writeReadyAthleteJourneyEntryCache(
  userId: string,
  entryState: AthleteJourneyAppEntryState,
): Promise<void> {
  try {
    const cacheKey = journeyEntryCacheKey(userId);
    if (entryState.status !== 'ready' || !entryState.hasProfile) {
      await AsyncStorage.removeItem(cacheKey);
      return;
    }

    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      version: JOURNEY_ENTRY_CACHE_VERSION,
      userId,
      savedAt: new Date().toISOString(),
      state: createReadyAthleteJourneyAppEntryState(),
    }));
  } catch (error) {
    logWarn('athleteJourneyEntryCache.writeReady', error, { journeyOperation: 'writeReadyEntryCache' });
  }
}
