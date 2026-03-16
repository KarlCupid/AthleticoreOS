import type { SimulationPersona } from './types.ts';

export const ThePerfectStudent: SimulationPersona = {
  name: "The Perfect Student",
  description: "Follows every instruction perfectly. 100% compliance, stable recovery.",
  workoutCompliance: 1.0,
  rpeBias: 0,
  averageSleepQuality: 8,
  averageReadiness: 8,
  readinessVolatility: 0.1,
  nutritionCompliance: 1.0,
  cheatDayProbability: 0,
  cheatDayCalorieBurden: 0
};

export const TheGrinder: SimulationPersona = {
  name: "The Grinder",
  description: "Always pushes harder. Reports higher RPE than prescribed. Poor sleep.",
  workoutCompliance: 1.0,
  rpeBias: 2.0, // Significant overshoot
  averageSleepQuality: 5,
  averageReadiness: 6,
  readinessVolatility: 0.2,
  nutritionCompliance: 0.9,
  cheatDayProbability: 0.05,
  cheatDayCalorieBurden: 500
};

export const TheSlacker: SimulationPersona = {
  name: "The Slacker",
  description: "Inconsistent. Skips 40% of workouts. Chaotic sleep and readiness.",
  workoutCompliance: 0.6,
  rpeBias: -1,
  averageSleepQuality: 6,
  averageReadiness: 5,
  readinessVolatility: 0.5,
  nutritionCompliance: 0.5,
  cheatDayProbability: 0.15,
  cheatDayCalorieBurden: 1200
};

export const TheBinger: SimulationPersona = {
  name: "The Binger",
  description: "Trains like a pro, but has massive weekend cheat days. Tests weight correction.",
  workoutCompliance: 1.0,
  rpeBias: 0,
  averageSleepQuality: 7,
  averageReadiness: 7,
  readinessVolatility: 0.2,
  nutritionCompliance: 0.7,
  cheatDayProbability: 0.14, // 1 day per week avg
  cheatDayCalorieBurden: 2500 // Massive surplus
};
