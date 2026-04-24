import type {
  DailyEngineSnapshotRow,
  DailyMission,
  WeeklyMissionPlan,
  WeeklyPlanEntryRow,
} from '../engine/index.ts';

export interface WeeklyMissionResolverOptions {
  forceRefresh?: boolean;
}

export interface WeeklyMissionResolverDependencies {
  engineVersion: string;
  loadWeeklyPlanEntries: (userId: string, weekStart: string) => Promise<WeeklyPlanEntryRow[]>;
  getDailyEngineSnapshotsForDates: (
    userId: string,
    dates: string[],
  ) => Promise<Map<string, DailyEngineSnapshotRow>>;
  updateDailyMissionSnapshotsByDate: (
    userId: string,
    snapshots: Array<{ date: string; mission: DailyMission }>,
  ) => Promise<void>;
  getDailyMission: (
    userId: string,
    date: string,
    options?: WeeklyMissionResolverOptions,
  ) => Promise<DailyMission>;
}

function hasCurrentMission(
  mission: DailyMission | null | undefined,
  engineVersion: string,
): mission is DailyMission {
  return mission?.engineVersion === engineVersion;
}

function findCurrentEntryMission(
  entries: WeeklyPlanEntryRow[],
  date: string,
  engineVersion: string,
): DailyMission | null {
  return entries.find((entry) => (
    entry.date === date
    && hasCurrentMission(entry.daily_mission_snapshot, engineVersion)
  ))?.daily_mission_snapshot ?? null;
}

export async function resolveWeeklyMissionWithDependencies(
  userId: string,
  weekStart: string,
  options: WeeklyMissionResolverOptions,
  dependencies: WeeklyMissionResolverDependencies,
): Promise<WeeklyMissionPlan> {
  const entries = await dependencies.loadWeeklyPlanEntries(userId, weekStart);

  if (entries.length === 0) {
    return {
      entries: [],
      headline: 'No weekly mission',
      summary: 'There is no active weekly plan for this window.',
    };
  }

  if (
    !options.forceRefresh
    && entries.every((entry) => hasCurrentMission(entry.daily_mission_snapshot, dependencies.engineVersion))
  ) {
    return {
      entries: entries.map((entry) => ({
        ...entry,
        daily_mission_snapshot: entry.daily_mission_snapshot ?? null,
      })),
      headline: 'Weekly mission',
      summary: `${entries.length} sessions loaded from saved mission snapshots.`,
    };
  }

  const uniqueDates = Array.from(new Set(entries.map((entry) => entry.date)));
  const storedSnapshots = options.forceRefresh
    ? new Map<string, DailyEngineSnapshotRow>()
    : await dependencies.getDailyEngineSnapshotsForDates(userId, uniqueDates);
  const snapshotsToWrite: Array<{ date: string; mission: DailyMission }> = [];
  const missionsByDate = new Map<string, DailyMission>();

  for (const date of uniqueDates) {
    if (!options.forceRefresh) {
      const entryMission = findCurrentEntryMission(entries, date, dependencies.engineVersion);
      if (entryMission) {
        missionsByDate.set(date, entryMission);
        continue;
      }
    }

    const storedMission = storedSnapshots.get(date)?.mission_snapshot;
    if (hasCurrentMission(storedMission, dependencies.engineVersion)) {
      missionsByDate.set(date, storedMission);
      snapshotsToWrite.push({ date, mission: storedMission });
      continue;
    }

    const mission = await dependencies.getDailyMission(userId, date, { forceRefresh: options.forceRefresh });
    missionsByDate.set(date, mission);
    snapshotsToWrite.push({ date, mission });
  }

  if (snapshotsToWrite.length > 0) {
    await dependencies.updateDailyMissionSnapshotsByDate(userId, snapshotsToWrite);
  }

  return {
    entries: entries.map((entry) => ({
      ...entry,
      daily_mission_snapshot: missionsByDate.get(entry.date) ?? entry.daily_mission_snapshot ?? null,
    })),
    headline: 'Weekly mission',
    summary: `${uniqueDates.length} daily missions aligned to the current block and saved for reuse.`,
  };
}
