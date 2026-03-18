import type { MorningFlowViewModel } from './types.ts';

export function buildMorningFlowViewModel(input: {
  checkinDone: boolean;
  sessionDone: boolean;
  nutritionLogged: boolean;
}): MorningFlowViewModel {
  const { checkinDone, sessionDone, nutritionLogged } = input;
  const completedCount = [checkinDone, sessionDone, nutritionLogged].filter(Boolean).length;

  let nextStepLabel: string;
  let nextStepTarget: MorningFlowViewModel['nextStepTarget'];

  if (!checkinDone) {
    nextStepLabel = 'Log your check-in';
    nextStepTarget = 'checkin';
  } else if (!sessionDone) {
    nextStepLabel = 'Start your session';
    nextStepTarget = 'training';
  } else {
    nextStepLabel = 'Log a meal';
    nextStepTarget = 'nutrition';
  }

  return {
    checkinDone,
    sessionDone,
    nutritionLogged,
    nextStepLabel,
    nextStepTarget,
    progressFraction: completedCount / 3,
  };
}
