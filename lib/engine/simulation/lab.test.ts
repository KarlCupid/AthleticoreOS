/**
 * Standalone test script for lib/engine/simulation replay behavior.
 *
 * Run with: node scripts/run-single-engine-test.js "C:\Users\karll\Documents\Athleticore OS\lib\engine\simulation\lab.test.ts"
 */

import { buildEngineReplayRun } from './lab.ts';
import { ThePerfectStudent } from './personas.ts';
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
    persona: ThePerfectStudent,
    initialState: {
      weightLbs: 185,
      fitnessLevel: 'advanced',
      goalMode: 'fight_camp',
      targetWeight: 170,
      fightDate: '2026-03-02',
    },
  });

  const conditioningDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.workoutType === 'conditioning'
    || log.personaAction.conditioningPrescription != null,
  );
  const combatDays = simulation.dailyLogs.filter((log) =>
    (log.engineState.scheduledActivities ?? []).some((activity: any) =>
      activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring',
    ),
  );
  const nonLowRiskDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.riskState.level !== 'low',
  );
  const sparSupportDays = simulation.dailyLogs.filter((log) =>
    log.engineState.mission.trainingDirective.sessionRole === 'spar_support',
  );
  const boxingPracticeDevelopDays = simulation.dailyLogs.filter((log) =>
    (log.engineState.scheduledActivities ?? []).some((activity: any) => activity.activity_type === 'boxing_practice')
    && log.engineState.mission.trainingDirective.sessionRole !== 'spar_support',
  );

  assert('Simulation yields conditioning days', conditioningDays.length > 0);
  assert('Simulation yields boxing or sparring days', combatDays.length > 0);
  assert('Simulation yields non-low risk days', nonLowRiskDays.length > 0);
  assert('Simulation yields spar support on real sparring days', sparSupportDays.length > 0);
  assert('Boxing practice days are not forced into spar support', boxingPracticeDevelopDays.length > 0);

  console.log('\n--- Replay mapping ---');

  const replayRun = await buildEngineReplayRun('camp-baseline');
  const replayConditioningDays = replayRun.days.filter((day) => day.workoutType === 'conditioning');
  const replayCombatDays = replayRun.days.filter((day) =>
    day.workoutType === 'practice' || day.workoutType === 'sparring',
  );
  const replayNonLowRiskDays = replayRun.days.filter((day) => day.riskLevel !== 'low');
  const replayRecoverMismatches = replayRun.days.filter((day) =>
    day.sessionRole === 'recover'
    && day.workoutType != null
    && day.workoutType !== 'recovery',
  );
  const replayHighCriticalDays = replayRun.days.filter((day) =>
    day.riskLevel === 'high' || day.riskLevel === 'critical',
  );

  assert('Replay exposes conditioning workout types', replayConditioningDays.length > 0);
  assert('Replay exposes boxing or sparring workout types', replayCombatDays.length > 0);
  assert('Replay no longer shows every day as low risk', replayNonLowRiskDays.length > 0);
  assert('Recover days stay mapped to recovery output', replayRecoverMismatches.length === 0);
  assert('High and critical risk days stay a minority of camp', replayHighCriticalDays.length <= Math.ceil(replayRun.days.length * 0.25));

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

void main().catch((error) => {
  failed++;
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(1);
});
