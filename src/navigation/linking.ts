import type { LinkingOptions } from '@react-navigation/native';

export const APP_LINK_PREFIXES = ['athleticore://'] as const;

export type AppDeepLinkTarget =
  | { route: 'today' }
  | { route: 'guided-workout'; weeklyPlanEntryId?: string; scheduledActivityId?: string; trainingDate?: string }
  | { route: 'nutrition-quick-log'; mealType?: string; date?: string }
  | { route: 'cut-protocol'; date?: string };

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (entries.length === 0) {
    return '';
  }

  const search = new URLSearchParams(entries as [string, string][]);
  return `?${search.toString()}`;
}

export function buildAppDeepLink(target: AppDeepLinkTarget): string {
  switch (target.route) {
    case 'today':
      return 'athleticore://today';
    case 'guided-workout':
      return `athleticore://train/session${buildQuery({
        weeklyPlanEntryId: target.weeklyPlanEntryId,
        scheduledActivityId: target.scheduledActivityId,
        trainingDate: target.trainingDate,
      })}`;
    case 'nutrition-quick-log':
      return `athleticore://fuel${buildQuery({
        mealType: target.mealType,
        date: target.date,
      })}`;
    case 'cut-protocol':
      return `athleticore://fuel/cut/fight-week${buildQuery({
        date: target.date,
      })}`;
  }
}

export const appLinking: LinkingOptions<any> = {
  prefixes: [...APP_LINK_PREFIXES],
  config: {
    screens: {
      Today: {
        screens: {
          TodayHome: 'today',
          Log: 'today/check-in',
          DayDetail: 'today/day/:date',
          ActivityLog: 'today/activity/:activityId/:date',
        },
      },
      Train: {
        screens: {
          WorkoutHome: 'train',
          GuidedWorkout: 'train/session',
          WorkoutDetail: 'train/detail/:weeklyPlanEntryId/:date',
          WorkoutSummary: 'train/summary',
          GymProfiles: 'train/gym-profiles',
        },
      },
      Plan: {
        screens: {
          PlanHome: 'plan',
          WeeklyPlanSetup: 'plan/setup',
          CalendarMain: 'plan/calendar',
          DayDetail: 'plan/day/:date',
          WeeklyReview: 'plan/review',
        },
      },
      Fuel: {
        screens: {
          NutritionHome: 'fuel',
          FoodSearch: 'fuel/search',
          FoodDetail: 'fuel/food',
          BarcodeScan: 'fuel/barcode',
          WeightCutHome: 'fuel/cut',
          CutPlanSetup: 'fuel/cut/setup',
          FightWeekProtocol: 'fuel/cut/fight-week',
          RehydrationProtocol: 'fuel/cut/rehydration',
          CutHistory: 'fuel/cut/history',
        },
      },
      Me: {
        screens: {
          MeHome: 'me',
          LegalSupport: 'me/legal',
          DeleteAccount: 'me/delete-account',
        },
      },
    },
  },
};
