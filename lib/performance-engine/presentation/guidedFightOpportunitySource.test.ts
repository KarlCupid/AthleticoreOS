import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

const objective = read('src/screens/weeklyPlanSetup/ObjectivePhase.tsx');
const flow = read('src/screens/weeklyPlanSetup/FightOpportunityFlow.tsx');
const controller = read('src/screens/weeklyPlanSetup/useWeeklyPlanSetupController.ts');
const service = read('lib/api/fightCampService.ts');
const setupTypes = read('lib/engine/types/fightCampV1.ts');
const viewModel = read('lib/performance-engine/presentation/guidedFightOpportunityViewModel.ts');

console.log('\n-- guided fight opportunity source --');

assert('Objective phase uses guided fight opportunity flow', objective.includes('FightOpportunityFlow'));
assert('Fight flow supports tentative status', flow.includes("value: 'tentative'"));
assert('Fight flow supports confirmed status', flow.includes("value: 'confirmed'"));
assert('Fight flow supports short-notice status', flow.includes("value: 'short_notice'"));
assert('Fight flow supports canceled status', flow.includes("value: 'canceled'"));
assert('Fight flow supports rescheduled status', flow.includes("value: 'rescheduled'"));
assert('Fight flow asks for weigh-in date and time', flow.includes('weighInDate') && flow.includes('weighInTime') && flow.includes('Weigh-in Date'));
assert('Fight flow asks for competition time', flow.includes('competitionTime') && flow.includes('Competition Time'));
assert('Fight flow asks for target weight class', flow.includes('targetWeightClassName') && flow.includes('Target Weight Class'));
assert('Fight flow asks for opponent and event details', flow.includes('opponentName') && flow.includes('eventName') && flow.includes('eventLocation'));
assert('Fight flow shows fight opportunity summary', flow.includes('Fight Opportunity Summary') && flow.includes('summary.recommendedTransition'));
assert('Fight flow shows readiness and risk context', flow.includes('summary.readinessEvaluation') && flow.includes('summary.riskHighlights'));
assert('Fight flow keeps protected work visible', flow.includes('summary.protectedWorkoutSummary'));
assert('Fight flow uses existing setup components', flow.includes("import { DatePickerField }") && flow.includes('OptionPill') && flow.includes('FieldNote'));
assert('Fight flow uses existing theme tokens', flow.includes("import { COLORS }"));
assert('Fight flow does not introduce a hex palette', !/#[0-9A-Fa-f]{3,8}/.test(flow));

assert('Controller builds fight summary from fight opportunity view model', controller.includes('buildGuidedFightOpportunityViewModel'));
assert('Controller tracks fight opportunity status', controller.includes('fightOpportunityStatus') && controller.includes('setFightOpportunityStatus'));
assert('Controller no longer requires target weight for every fight opportunity', controller.includes('target scale weight, or leave it blank'));
assert('Controller treats tentative fight as build-preserving', controller.includes("fightOpportunityStatus === 'tentative'") && controller.includes("goalMode: 'build_phase'"));
assert('Controller treats canceled fight as build-preserving', controller.includes("fightOpportunityStatus === 'canceled'") && controller.includes("goalMode: 'build_phase'"));

assert('Service passes fight metadata into fight opportunity engine', service.includes('competitionTime') && service.includes('targetWeightClassName') && service.includes('opponentName') && service.includes('eventName'));
assert('Service resolves short-notice status from timing', service.includes('resolveFightOpportunityStatus') && service.includes("daysOut <= 28 ? 'short_notice' : 'confirmed'"));
assert('Setup input supports fight opportunity metadata', setupTypes.includes('fightOpportunityStatus') && setupTypes.includes('weighInDate') && setupTypes.includes('targetWeightClassName'));

assert('View model names body-mass feasibility handoff', viewModel.includes('body-mass and weight-class feasibility'));
assert('View model avoids reset/start-over language', !/start over|restart|reset|transition executed/.test(viewModel.toLowerCase()));
assert('View model avoids unsafe weight-cut wording', !/weight-cut| cut |sauna|sweat suit/.test(viewModel.toLowerCase()));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
