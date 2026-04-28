import type { LinkingOptions } from '@react-navigation/native';

export const APP_LINK_PREFIXES = ['athleticore://'] as const;

export type AppDeepLinkTarget =
  | { route: 'today' }
  | { route: 'guided-workout'; weeklyPlanEntryId?: string; scheduledActivityId?: string; trainingDate?: string }
  | { route: 'nutrition-quick-log'; mealType?: string; date?: string }
  | { route: 'competition-body-mass'; date?: string };

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
    case 'competition-body-mass':
      return `athleticore://fuel/body-mass/competition${buildQuery({
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
          WeightClassHome: 'fuel/body-mass',
          WeightClassPlanSetup: 'fuel/body-mass/weight-class/setup',
          CompetitionBodyMass: 'fuel/body-mass/competition',
          PostWeighInRecovery: 'fuel/body-mass/post-weigh-in',
          WeightClassHistory: 'fuel/body-mass/history',
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
