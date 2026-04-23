import { buildFoodSearchQueryProfile } from '../api/foodSearchSupport.ts';
import { buildUsdaQueryPlans } from '../api/usdaFoodData.ts';

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

console.log('\n-- usda query planning --');
{
  const chickenProfile = buildFoodSearchQueryProfile('chicken');
  const chickenVariants = ['chicken', 'chicken breast', 'chicken thigh', 'chicken tenderloin'];

  const demoPlans = buildUsdaQueryPlans(chickenProfile, chickenVariants, {
    allowExpandedSearch: false,
  });
  assert('demo key limits chicken USDA fan-out', demoPlans.length === 2);

  const configuredPlans = buildUsdaQueryPlans(chickenProfile, chickenVariants, {
    allowExpandedSearch: true,
  });
  assert('configured USDA key keeps expanded chicken search', configuredPlans.length === 8);

  const steakProfile = buildFoodSearchQueryProfile('sirloin steak');
  const steakVariants = ['sirloin steak', 'sirloin', 'steak'];
  const narrowPlans = buildUsdaQueryPlans(steakProfile, steakVariants, {
    allowExpandedSearch: false,
  });
  assert('demo key narrows multi-word USDA search variants', narrowPlans.length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  throw new Error(`${failed} USDA planning tests failed`);
}
