import type { DailyMission } from '../types/mission.ts';
import type { MissionRiskLevel } from '../types/mission.ts';
import type { CompassViewModel } from './types.ts';
import { getPrimaryDecisionReason } from './decisionReason.ts';
import { getSessionFamilyLabel, getSessionRoleLabel } from '../sessionLabels.ts';

const NULL_DEFAULT: CompassViewModel = {
  headline: 'Ready to train',
  summaryLine: 'Complete your check-in to unlock today\'s plan.',
  primaryCTALabel: 'Log Check-in',
  primaryCTATarget: 'checkin',
  secondaryCTALabel: null,
  secondaryCTATarget: null,
  reasonSentence: 'Log your readiness to generate today\'s recommendations.',
  riskLevel: 'low',
  sessionLabel: 'Training Session',
  sessionRoleLabel: 'Training Session',
  hasPrescription: false,
};

export function buildCompassViewModel(
  mission: DailyMission | null,
  hasPrescription: boolean,
  checkinDone: boolean,
  sessionDone: boolean,
): CompassViewModel {
  if (!mission) return NULL_DEFAULT;

  let primaryCTALabel: string;
  let primaryCTATarget: CompassViewModel['primaryCTATarget'];
  let secondaryCTALabel: string | null = null;
  let secondaryCTATarget: CompassViewModel['secondaryCTATarget'] = null;

  if (!checkinDone) {
    primaryCTALabel = 'Log Check-in';
    primaryCTATarget = 'checkin';
    if (hasPrescription) {
      secondaryCTALabel = 'View Training Plan';
      secondaryCTATarget = 'training';
    }
  } else if (hasPrescription && !sessionDone) {
    primaryCTALabel = 'Start Training';
    primaryCTATarget = 'training';
    secondaryCTALabel = 'Log Fuel';
    secondaryCTATarget = 'nutrition';
  } else if (sessionDone) {
    primaryCTALabel = 'Log Fuel';
    primaryCTATarget = 'nutrition';
    secondaryCTALabel = 'View Plan';
    secondaryCTATarget = 'plan';
  } else {
    primaryCTALabel = 'View Plan';
    primaryCTATarget = 'plan';
    secondaryCTALabel = 'Log Fuel';
    secondaryCTATarget = 'nutrition';
  }

  const reasonVM = getPrimaryDecisionReason(mission.decisionTrace ?? []);

  return {
    headline: mission.headline,
    summaryLine: mission.summary,
    primaryCTALabel,
    primaryCTATarget,
    secondaryCTALabel,
    secondaryCTATarget,
    reasonSentence: reasonVM.sentence,
    riskLevel: (mission.riskState?.level ?? 'low') as MissionRiskLevel,
    sessionLabel: getSessionFamilyLabel({
      workoutType: mission.trainingDirective.workoutType,
      focus: mission.trainingDirective.focus,
      prescription: mission.trainingDirective.prescription,
    }),
    sessionRoleLabel: getSessionRoleLabel(mission.trainingDirective.sessionRole),
    hasPrescription,
  };
}
