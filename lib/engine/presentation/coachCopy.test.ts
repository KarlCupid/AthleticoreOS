import { humanizeCoachCopy, humanizeCoachSentence } from './coachCopy.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
    return;
  }

  failed += 1;
  console.error(`  FAIL ${label}`);
}

console.log('\n-- exact coach copy replacements --');

assert(
  'recommendations fallback becomes plan language',
  humanizeCoachCopy("Log your readiness to generate today's recommendations.") ===
    "Check in so we can show today's plan.",
);
assert(
  'green summary becomes plain language',
  humanizeCoachCopy('All systems green.') === 'You are good to train today.',
);

console.log('\n-- pattern coach copy replacements --');

assert(
  'session becomes workout',
  humanizeCoachCopy('Keep this session short and sharp.') ===
    'Keep this workout short and sharp.',
);
assert(
  'training load becomes workload',
  humanizeCoachCopy('Your training load is high today.') ===
    'Your workload is high today.',
);
assert(
  'why this matters prefix is removed',
  humanizeCoachCopy('Why this matters: baseline controls your daily training recommendation.') ===
    'baseline controls your daily training plan.',
);

console.log('\n-- sentence cleanup --');

assert(
  'first sentence is kept and punctuated',
  humanizeCoachSentence('Push with control. Keep the extra volume for later.') ===
    'Push with control.',
);
assert(
  'fallback sentence is humanized',
  humanizeCoachSentence('', 'Following the scheduled training plan.') ===
    'This fits your plan today.',
);
assert(
  'long sentences are capped',
  humanizeCoachSentence('Focus on follow-through by matching the engine recommendations because that is the fastest way to improve your training next week.') ===
    'Focus on follow-through by matching the engine plan because that is the fastest way to improve.',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
