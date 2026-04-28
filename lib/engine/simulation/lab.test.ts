/**
 * Standalone test script for lib/engine/simulation replay behavior.
 *
 * Run with: node scripts/run-single-engine-test.js "C:\Users\karll\Documents\Athleticore OS\lib\engine\simulation\lab.test.ts"
 */

import { buildEngineReplayRun } from './lab.ts';
import { TheCoachablePro, TheGrinder } from './personas.ts';
import { runSimulation } from './runner.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

async function main() {
  console.log('\n--- Simulation camp distribution ---');

  const simulation = await runSimulation({
    startDate: '2026-02-02',
    weeks: 4,
    seed: 17,
    persona: TheCoachablePro,
    initialState: {
      weightLbs: 185,
      fitnessLevel: 'advanced',
      goalMode: 'fight_camp',
      targetWeight: 170,
      fightDate: '2026-03-02',
    },
  });

  const restorativeDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'recovery'
    || log.engineState.mission.trainingDirective.sessionRole === 'rest'
    || log.engineState.mission.trainingDirective.sessionRole === 'recover',
  );
  const guidedTrainingDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'strength'
    || log.engineState.mission.trainingDirective.workoutType === 'conditioning',
  );
  const nonLowRiskDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.riskState.level !== 'low',
  );
  const combatDays = simulation.dailyLogs.filter((log) =>
    (log.engineState.scheduledActivities ?? []).some((activity: any) =>
      activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring',
    ),
  );
  const cleanSlateStrengthDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'strength',
  );
  const cleanSlateConditioningDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'conditioning',
  );

  assert('Simulation yields restorative outputs', restorativeDays.length > 0);
  assert('Simulation clean slate has no pre-scheduled combat anchors', combatDays.length === 0);
  assert('Simulation yields guided training days from a clean slate', guidedTrainingDays.length > 0);
  assert('Simulation clean-slate compliant camp keeps non-low risk days bounded', nonLowRiskDays.length <= Math.ceil(simulation.dailyLogs.length * 0.2));
  assert('Simulation still produces strength days from a clean slate', cleanSlateStrengthDays.length > 0);
  assert('Simulation still produces conditioning days from a clean slate', cleanSlateConditioningDays.length > 0);

  const pressureSimulation = await runSimulation({
    startDate: '2026-02-02',
    weeks: 4,
    seed: 17,
    persona: TheGrinder,
    initialState: {
      weightLbs: 185,
      fitnessLevel: 'advanced',
      goalMode: 'fight_camp',
      targetWeight: 170,
      fightDate: '2026-03-02',
    },
  });
  const pressureNonLowRiskDays = pressureSimulation.dailyLogs.filter((log) =>
    log.engineState.mission.riskState.level !== 'low',
  );
  const pressureGuidedTrainingDays = pressureSimulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'strength'
    || log.engineState.mission.trainingDirective.workoutType === 'conditioning',
  );

  assert('Simulation pressure persona still receives guided training', pressureGuidedTrainingDays.length > 0);
  assert('Adaptive scheduler keeps pressure persona risk bounded on a clean slate', pressureNonLowRiskDays.length <= Math.ceil(pressureSimulation.dailyLogs.length * 0.2));

  console.log('\n--- Replay mapping ---');

  const replayRun = await buildEngineReplayRun('camp-baseline');
  const replayConditioningDays = replayRun.days.filter((day) => day.workoutType === 'conditioning');
  const replayStrengthDays = replayRun.days.filter((day) => day.workoutType === 'strength');
  const replayCombatDays = replayRun.days.filter((day) => day.workoutType === 'practice' || day.workoutType === 'sparring');
  const replayNonLowRiskDays = replayRun.days.filter((day) => day.riskLevel !== 'low');
  const replayRecoverMismatches = replayRun.days.filter((day) =>
    day.sessionRole === 'recover'
    && day.workoutType != null
    && day.workoutType !== 'recovery',
  );
  const replayRestRiskMismatches = replayRun.days.filter((day) =>
    day.sessionRole === 'rest'
    && day.riskLevel !== 'low',
  );
  const replayConstrainedCombatLabels = replayRun.days.filter((day) =>
    (day.sessionRole === 'recover' || day.sessionRole === 'cut_protect' || day.sessionRole === 'rest')
    && (day.workoutType === 'practice' || day.workoutType === 'sparring'
      || day.workoutTitle.toLowerCase().includes('sparring')
      || day.workoutTitle.toLowerCase().includes('bag work')
      || day.workoutTitle.toLowerCase().includes('pad work')),
  );
  const replayHighCriticalDays = replayRun.days.filter((day) =>
    day.riskLevel === 'high' || day.riskLevel === 'critical',
  );

  assert('Replay exposes conditioning workout types', replayConditioningDays.length > 0);
  assert('Replay exposes strength workout types', replayStrengthDays.length > 0);
  assert('Replay clean slate does not inject combat workout types', replayCombatDays.length === 0);
  assert('Replay clean-slate baseline keeps non-low risk days to a minority', replayNonLowRiskDays.length <= Math.ceil(replayRun.days.length * 0.2));
  assert('Recover days stay mapped to recovery output', replayRecoverMismatches.length === 0);
  assert('Rest days stay low risk in replay', replayRestRiskMismatches.length === 0);
  assert('Constrained roles do not inherit combat labels', replayConstrainedCombatLabels.length === 0);
  assert('High and critical risk days stay a minority of camp', replayHighCriticalDays.length <= Math.ceil(replayRun.days.length * 0.25));

  const replayRunSeedA = await buildEngineReplayRun('camp-baseline', { seedOverride: 101 });
  const replayRunSeedB = await buildEngineReplayRun('camp-baseline', { seedOverride: 202 });
  const replaySignatureA = JSON.stringify({
    seed: replayRunSeedA.scenario.config.seed,
    finalWeight: replayRunSeedA.summary.finalWeightLbs,
    interventions: replayRunSeedA.summary.interventionDays,
    firstDayCalories: replayRunSeedA.days[0]?.actualCalories ?? null,
    firstDayWorkout: replayRunSeedA.days[0]?.prescribedExercises.map((exercise) => exercise.exerciseId).join('|') ?? '',
  });
  const replaySignatureB = JSON.stringify({
    seed: replayRunSeedB.scenario.config.seed,
    finalWeight: replayRunSeedB.summary.finalWeightLbs,
    interventions: replayRunSeedB.summary.interventionDays,
    firstDayCalories: replayRunSeedB.days[0]?.actualCalories ?? null,
    firstDayWorkout: replayRunSeedB.days[0]?.prescribedExercises.map((exercise) => exercise.exerciseId).join('|') ?? '',
  });

  assert('Replay override seed is reflected in the run metadata', replayRunSeedA.scenario.config.seed === 101);
  assert('Different replay seeds produce different replay outputs', replaySignatureA !== replaySignatureB);

  console.log('\n--- Body-mass support replay semantics ---');

  const activeCutRun = await buildEngineReplayRun('camp-active-cut');
  const bodyMassSupportDays = activeCutRun.days.filter((day) => day.bodyMassSupportPhase !== 'none');

  assert('Body-mass support replay can remain intervention-free on a clean slate', activeCutRun.summary.interventionDays === 0);
  assert('Body-mass support context is visible in replay days', bodyMassSupportDays.length > 0);
  assert('Body-mass support replay has no unrelated interventions on a clean slate', activeCutRun.summary.nonBodyMassInterventionDays === 0);
  assert('Body-mass support replay reduces unrelated interventions below the prior 27-day baseline', activeCutRun.summary.nonBodyMassInterventionDays < 27);
  assert('Body-mass support replay reduces overall interventions below the prior 31-day baseline', activeCutRun.summary.interventionDays < 31);
  assert('Body-mass support replay reduces high-risk days below the prior 24-day baseline', activeCutRun.summary.highRiskDays < 24);
  assert('Body-mass support replay can show zero engine danger days on a clean slate', activeCutRun.summary.engineDangerDays === 0);
  assert('Body-mass support replay keeps athlete override days low for a compliant athlete', activeCutRun.summary.athleteOverrideDays <= Math.ceil(activeCutRun.summary.totalDays * 0.1));
  assert('Retired protocol intervention no longer creates scenario pressure', activeCutRun.summary.scenarioPressureDays === 0);

  console.log('\n--- Safety scenario replays ---');

  const taperProtectionRun = await buildEngineReplayRun('camp-taper-cut-protection');
  const peakConcurrentCutRun = await buildEngineReplayRun('camp-peak-concurrent-cut');

  assert('Taper cut protection replay builds a full camp', taperProtectionRun.days.length > 0);
  assert('Peak concurrent cut replay builds a full camp', peakConcurrentCutRun.days.length > 0);
  assert('Taper cut protection replay keeps high-risk days to a minority', taperProtectionRun.summary.highRiskDays <= Math.ceil(taperProtectionRun.summary.totalDays * 0.25));
  assert('Peak concurrent cut replay keeps high-risk days to a minority', peakConcurrentCutRun.summary.highRiskDays <= Math.ceil(peakConcurrentCutRun.summary.totalDays * 0.25));

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

void main().catch((error) => {
  failed++;
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(1);
});
