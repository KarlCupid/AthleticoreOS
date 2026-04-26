import type { DailyMission } from '../types/mission.ts';
import type { MissionRiskLevel } from '../types/mission.ts';
import type { CompassViewModel } from './types.ts';
import { getPrimaryDecisionReason } from './decisionReason.ts';
import { getSessionFamilyLabel, getSessionRoleLabel } from '../sessionLabels.ts';

const NULL_DEFAULT: CompassViewModel = {
  headline: 'Ready to train',
  summaryLine: 'Complete your check-in to see today\'s plan.',
  primaryCTALabel: 'Log Check-in',
  primaryCTATarget: 'checkin',
  secondaryCTALabel: null,
  secondaryCTATarget: null,
  reasonSentence: 'Check in so we can show today\'s plan.',
  riskLevel: 'low',
  sessionLabel: 'Training Session',
  sessionRoleLabel: 'Training Session',
  hasPrescription: false,
};

function buildMissionHeadline(mission: DailyMission, sessionLabel: string): string {
  const directive = mission.trainingDirective;

  if (directive.isMandatoryRecovery || directive.interventionState === 'hard') {
    return 'Recovery first';
  }

  if (directive.interventionState === 'soft') {
    return 'Keep it controlled';
  }

  switch (directive.sessionRole) {
    case 'rest':
      return 'Rest today';
    case 'recover':
      return 'Recovery first';
    case 'cut_protect':
      return 'Keep it light';
    case 'spar_support':
      return 'Support the main work';
    case 'taper_sharpen':
      return 'Stay sharp';
    case 'express':
      return sessionLabel === 'Training Session' ? 'Push the key work' : `${sessionLabel} today`;
    case 'develop':
    default:
      return sessionLabel === 'Training Session' ? 'Train today' : `${sessionLabel} today`;
  }
}

function buildMissionSummary(mission: DailyMission): string {
  const directive = mission.trainingDirective;

  if (directive.isMandatoryRecovery || directive.interventionState === 'hard') {
    return 'Keep it easy today. Do not add extra work.';
  }

  if (directive.interventionState === 'soft') {
    return 'Do the main work. Skip optional extras.';
  }

  switch (directive.sessionRole) {
    case 'rest':
      return 'No training today. Let the work settle.';
    case 'recover':
      return 'Move easy and leave the tank fuller than you found it.';
    case 'cut_protect':
      return 'Stay controlled. Protect energy and make weight.';
    case 'spar_support':
      return 'Help the main session. Do not chase extra fatigue.';
    case 'taper_sharpen':
      return 'Move well. Finish fresh.';
    case 'express':
      return 'You have room to train. Keep the work clean.';
    case 'develop':
    default:
      return 'Do the planned work. Keep reps clean.';
  }
}

function buildMissionReason(mission: DailyMission, fallbackReason: string): string {
  const directive = mission.trainingDirective;
  const riskLevel = mission.riskState?.level ?? 'low';

  if (directive.isMandatoryRecovery || directive.interventionState === 'hard') {
    return 'Your body needs the lighter option today.';
  }

  if (directive.interventionState === 'soft' || riskLevel === 'high' || riskLevel === 'critical') {
    return 'Recent strain is high, so today stays controlled.';
  }

  if (directive.sessionRole === 'rest') {
    return 'No training is scheduled, so recovery is the job.';
  }

  if (directive.sessionRole === 'cut_protect' || directive.source === 'weight_cut_protocol') {
    return 'The cut is setting today\'s limits.';
  }

  if (directive.sessionRole === 'spar_support') {
    return 'The goal is to support the harder combat work.';
  }

  if (directive.sessionRole === 'taper_sharpen') {
    return 'The goal is to stay sharp without carrying fatigue.';
  }

  if (riskLevel === 'moderate') {
    return 'You can train, but keep the work honest.';
  }

  return fallbackReason || 'Today matches your plan and current readiness.';
}

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
  const sessionLabel = getSessionFamilyLabel({
    workoutType: mission.trainingDirective.workoutType,
    focus: mission.trainingDirective.focus,
    prescription: mission.trainingDirective.prescription,
  });

  return {
    headline: buildMissionHeadline(mission, sessionLabel),
    summaryLine: buildMissionSummary(mission),
    primaryCTALabel,
    primaryCTATarget,
    secondaryCTALabel,
    secondaryCTATarget,
    reasonSentence: buildMissionReason(mission, reasonVM.sentence),
    riskLevel: (mission.riskState?.level ?? 'low') as MissionRiskLevel,
    sessionLabel,
    sessionRoleLabel: getSessionRoleLabel(mission.trainingDirective.sessionRole),
    hasPrescription,
  };
}
