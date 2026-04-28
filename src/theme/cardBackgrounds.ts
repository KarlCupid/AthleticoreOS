import type { ImageSourcePropType } from 'react-native';

export const CARD_BACKGROUNDS = {
  default: require('../../assets/images/dashboard/support-card-bg.png'),
  mission: require('../../assets/images/dashboard/mission-card-bg.png'),
  readiness: require('../../assets/images/dashboard/readiness-hero-card-bg.png'),
  training: require('../../assets/images/dashboard/training-detail-card-bg.png'),
  trainingLoad: require('../../assets/images/dashboard/training-load-card-bg.png'),
  trainingTrend: require('../../assets/images/dashboard/training-trend-card-bg.png'),
  schedule: require('../../assets/images/dashboard/schedule-card-bg.png'),
  fuel: require('../../assets/images/dashboard/fuel-card-bg.png'),
  nutrition: require('../../assets/images/dashboard/nutrition-detail-card-bg.png'),
  bodyTrend: require('../../assets/images/dashboard/body-trend-card-bg.png'),
  bodyweight: require('../../assets/images/dashboard/bodyweight-direction-card-bg.png'),
  risk: require('../../assets/images/dashboard/risk-alert-card-bg.png'),
  consistency: require('../../assets/images/dashboard/consistency-card-bg.png'),
  performance: require('../../assets/images/dashboard/performance-pulse-card-bg.png'),
  camp: require('../../assets/images/dashboard/camp-card-bg.png'),
  workoutFloor: require('../../assets/images/cards/workout-floor-card-bg.png'),
  fuelQuiet: require('../../assets/images/cards/nutrition-hydration-card-bg.png'),
  bodyMassSupport: require('../../assets/images/cards/fight-week-card-bg.png'),
  planning: require('../../assets/images/cards/planning-card-bg.png'),
  profile: require('../../assets/images/cards/profile-recovery-card-bg.png'),
} satisfies Record<string, ImageSourcePropType>;

export type CardBackgroundKey = keyof typeof CARD_BACKGROUNDS;
