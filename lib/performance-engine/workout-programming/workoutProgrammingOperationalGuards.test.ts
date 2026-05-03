declare const require: (path: string) => {
  buildAuditReport?: (projectRoot?: string) => {
    summary: {
      errors: number;
      productionBlockers: number;
      gatedPreviewContent: number;
      reviewBlockers: number;
      unsafeProductionEligible: number;
    };
    gatedPreviewContent: Array<{ id: string }>;
    reviewBlockers: Array<{ id: string }>;
  };
  isLocalSupabaseUrl?: (value: string) => boolean;
  liveDbTestBlocker?: (input: {
    env: Record<string, string | undefined>;
    label: string;
    enableFlag: string;
    allowRemoteFlag: string;
    supabaseUrl?: string;
  }) => string | null;
};

const {
  buildAuditReport,
} = require('../../../scripts/workout-programming-content-utils.js');
const {
  isLocalSupabaseUrl,
  liveDbTestBlocker,
} = require('../../../scripts/workout-programming-db-test-guards.js');

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

async function run(): Promise<void> {
  console.log('\n-- workout programming operational guards --');

  assert('local Supabase URLs are recognized as safe default live-test targets', Boolean(
    isLocalSupabaseUrl?.('http://127.0.0.1:54321')
      && isLocalSupabaseUrl?.('http://localhost:54321')
      && !isLocalSupabaseUrl?.('https://example.supabase.co'),
  ));

  assert('live DB guards require explicit opt-in before any Supabase test run', Boolean(
    liveDbTestBlocker?.({
      env: {},
      label: 'Workout-programming live RLS tests',
      enableFlag: 'WORKOUT_RLS_TESTS',
      allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
      supabaseUrl: 'http://127.0.0.1:54321',
    })?.includes('WORKOUT_RLS_TESTS=1'),
  ));

  assert('live DB guards refuse remote Supabase projects unless explicitly allowed', Boolean(
    liveDbTestBlocker?.({
      env: { WORKOUT_RLS_TESTS: '1' },
      label: 'Workout-programming live RLS tests',
      enableFlag: 'WORKOUT_RLS_TESTS',
      allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
      supabaseUrl: 'https://project.supabase.co',
    })?.includes('WORKOUT_RLS_ALLOW_REMOTE=1'),
  ));

  assert('live DB guards require a non-production marker for remote projects', Boolean(
    liveDbTestBlocker?.({
      env: { WORKOUT_RLS_TESTS: '1', WORKOUT_RLS_ALLOW_REMOTE: '1' },
      label: 'Workout-programming live RLS tests',
      enableFlag: 'WORKOUT_RLS_TESTS',
      allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
      supabaseUrl: 'https://project.supabase.co',
    })?.includes('WORKOUT_SUPABASE_NON_PRODUCTION=1'),
  ));

  assert('live DB guards allow remote projects only with explicit non-production confirmation', liveDbTestBlocker?.({
    env: {
      WORKOUT_RLS_TESTS: '1',
      WORKOUT_RLS_ALLOW_REMOTE: '1',
      WORKOUT_SUPABASE_NON_PRODUCTION: '1',
      WORKOUT_SUPABASE_TARGET_LABEL: 'workout-programming-live-db-test',
    },
    label: 'Workout-programming live RLS tests',
    enableFlag: 'WORKOUT_RLS_TESTS',
    allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
    supabaseUrl: 'https://project.supabase.co',
  }) === null);

  assert('live DB guards refuse configured production Supabase URLs', Boolean(
    liveDbTestBlocker?.({
      env: {
        WORKOUT_RLS_TESTS: '1',
        WORKOUT_RLS_ALLOW_REMOTE: '1',
        WORKOUT_SUPABASE_NON_PRODUCTION: '1',
        WORKOUT_PRODUCTION_SUPABASE_URL: 'https://production-ref.supabase.co',
      },
      label: 'Workout-programming live RLS tests',
      enableFlag: 'WORKOUT_RLS_TESTS',
      allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
      supabaseUrl: 'https://production-ref.supabase.co',
    })?.includes('production URL'),
  ));

  assert('live DB guards refuse production-labelled remote targets', Boolean(
    liveDbTestBlocker?.({
      env: {
        WORKOUT_RLS_TESTS: '1',
        WORKOUT_RLS_ALLOW_REMOTE: '1',
        WORKOUT_SUPABASE_NON_PRODUCTION: '1',
        WORKOUT_SUPABASE_TARGET_LABEL: 'production',
      },
      label: 'Workout-programming live RLS tests',
      enableFlag: 'WORKOUT_RLS_TESTS',
      allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
      supabaseUrl: 'https://project.supabase.co',
    })?.includes('labelled production'),
  ));

  assert('live DB guards allow local projects without remote override once explicitly enabled', liveDbTestBlocker?.({
    env: { WORKOUT_RLS_TESTS: '1' },
    label: 'Workout-programming live RLS tests',
    enableFlag: 'WORKOUT_RLS_TESTS',
    allowRemoteFlag: 'WORKOUT_RLS_ALLOW_REMOTE',
    supabaseUrl: 'http://127.0.0.1:54321',
  }) === null);

  const audit = buildAuditReport?.(process.cwd());
  assert('content audit does not treat intentionally gated preview content as a production error', Boolean(
    audit
      && audit.summary.errors === 0
      && audit.summary.productionBlockers === 0
      && audit.summary.gatedPreviewContent > 0
      && audit.summary.reviewBlockers > 0
      && audit.summary.unsafeProductionEligible === 0,
  ));

  assert('content audit review entries retain actionable record IDs', Boolean(
    audit
      && audit.gatedPreviewContent.some((item) => item.id === 'hip_thrust')
      && audit.reviewBlockers.every((item) => item.id && item.id !== 'unknown'),
  ));
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
