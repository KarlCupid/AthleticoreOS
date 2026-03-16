import type {
  SimulationResult,
  DailySimulationLog,
  SimulationConfig,
} from './types.ts';

export function generateCSVReport(result: SimulationResult): string {
  const { config, dailyLogs } = result;
  const { persona } = config;

  const headers = [
    'Date',
    'Persona',
    'Readiness Score',
    'Sleep Score',
    'Weight (Start)',
    'Weight (End)',
    'Central Fatigue',
    'Muscular Damage',
    'ACWR Ratio',
    'Mission Headline',
    'Session Role',
    'Prescribed RPE',
    'Actual RPE',
    'Compliance',
    'Actual Calories',
    'Is Cheat Day?',
    'Fuel State',
    'Fuel Adjustment',
    'Cut Phase',
    'Water Target (oz)',
    'Sodium Target (mg)',
    'Fiber State',
    'Intervention State',
    'Mandatory Recovery',
    'Weight Drift (lbs)',
    'Cut Intervention Reason',
    'Sessions (Full)',
    'Risk Level',
    'Risk Score',
    'Primary Driver',
    'Workout Blueprint',
    'Coach\'s Notes',
    'Athlete Diary',
    'Decision Trace (Full)'
  ];

  const rows = dailyLogs.map(log => {
    const { date, engineState, personaAction, stateBefore, stateAfter } = log;
    const { mission, acwr } = engineState;
    const completedSession = personaAction.sessionsCompleted[0] || null;

    return [
      date,
      persona.name,
      personaAction.readinessLogged,
      personaAction.sleepLogged,
      stateBefore.metabolism.currentWeightLbs.toFixed(2),
      stateAfter.metabolism.currentWeightLbs.toFixed(2),
      stateAfter.fatigue.centralFatigue.toFixed(1),
      stateAfter.fatigue.muscularDamage.toFixed(1),
      acwr.ratio.toFixed(2),
      `"${mission.headline.replace(/"/g, '""')}"`,
      mission.trainingDirective.sessionRole,
      mission.trainingDirective.intensityCap || 'N/A',
      completedSession ? completedSession.actualRpe : 0,
      completedSession ? 'YES' : 'NO',
      personaAction.actualCalories,
      personaAction.isCheatDay ? 'YES' : 'NO',
      mission.fuelDirective.state,
      mission.fuelDirective.adjustmentFlag || 'none',
      personaAction.cutPhase || 'none',
      personaAction.waterTargetOz || 0,
      personaAction.sodiumTargetMg || 'Normal',
      `"${(personaAction.fiberState || 'Normal').replace(/"/g, '""')}"`,
      personaAction.interventionState || 'none',
      personaAction.isMandatoryRecovery ? 'YES' : 'NO',
      personaAction.weightDriftLbs ?? '',
      `"${(personaAction.cutInterventionReason || '').replace(/"/g, '""')}"`,
      `"${personaAction.sessionsCompleted.map(s => `${s.sessionName} (${s.actualRpe})`).join(' | ').replace(/"/g, '""')}"`,
      mission.riskState.level,
      mission.riskState.score,
      `"${(mission.riskState.drivers[0] || 'None').replace(/"/g, '""')}"`,
      `"${(personaAction.workoutBlueprint || 'Rest Day').replace(/"/g, '""')}"`, // Workout Blueprint
      `"${(personaAction.coachingInsight || '').replace(/"/g, '""')}"`, // Coach's Notes
      `"${(personaAction.athleteMonologue || '').replace(/"/g, '""')}"`, // Athlete Diary
      `"${mission.decisionTrace.map(t => `${t.subsystem}: ${t.title}`).join(' | ').replace(/"/g, '""')}"`
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
