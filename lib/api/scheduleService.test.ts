const path = require('node:path');

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

function assertEqual(label: string, actual: unknown, expected: unknown) {
  assert(label, actual === expected);
}

function createMockSupabase(config: {
  activityType?: string;
  activityDate?: string | null;
  trainingSessionError?: unknown;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const supabase = {
    from(table: string) {
      const state = {
        operation: '',
        updateEqCount: 0,
      };
      const builder = {
        select(...args: unknown[]) {
          calls.push({ table, method: 'select', args });
          state.operation = 'select';
          return builder;
        },
        update(...args: unknown[]) {
          calls.push({ table, method: 'update', args });
          state.operation = 'update';
          return builder;
        },
        insert(...args: unknown[]) {
          calls.push({ table, method: 'insert', args });
          if (table === 'training_sessions') {
            return Promise.resolve({ error: config.trainingSessionError ?? null });
          }
          return Promise.resolve({ error: null });
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: 'eq', args });
          if (table === 'scheduled_activities' && state.operation === 'update') {
            state.updateEqCount++;
            if (state.updateEqCount >= 2) {
              return { error: null };
            }
          }
          return builder;
        },
        single() {
          calls.push({ table, method: 'single', args: [] });
          return Promise.resolve({
            data: {
              date: config.activityDate ?? '2026-04-29',
              activity_type: config.activityType ?? 'boxing_practice',
            },
            error: null,
          });
        },
      };

      return builder;
    },
  };

  return { supabase, calls };
}

function loadScheduleService(mockSupabase: unknown) {
  const supabasePath = path.join(process.cwd(), 'lib', 'supabase.ts');
  const servicePath = path.join(process.cwd(), 'lib', 'api', 'scheduleService.ts');

  delete require.cache[supabasePath];
  delete require.cache[servicePath];
  (require.cache as Record<string, unknown>)[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { supabase: mockSupabase },
    children: [],
    paths: [],
  };

  return require(servicePath);
}

async function run() {
  console.log('\n-- schedule service completion --');

  {
    const { supabase, calls } = createMockSupabase({ activityType: 'boxing_practice' });
    const { completeActivity } = loadScheduleService(supabase);

    await completeActivity('user-1', 'activity-1', {
      actual_duration_min: 60,
      actual_rpe: 7,
      notes: 'done',
      components: [],
    });

    const trainingInsert = calls.find((call) => call.table === 'training_sessions' && call.method === 'insert');
    assert('training activity inserts ACWR workload row', Boolean(trainingInsert));
    assertEqual('training session uses scheduled activity date', (trainingInsert?.args[0] as any)?.date, '2026-04-29');
  }

  {
    const sessionError = new Error('training session insert failed');
    const { supabase, calls } = createMockSupabase({
      activityType: 'boxing_practice',
      trainingSessionError: sessionError,
    });
    const { completeActivity } = loadScheduleService(supabase);

    let thrown: unknown = null;
    try {
      await completeActivity('user-1', 'activity-1', {
        actual_duration_min: 60,
        actual_rpe: 7,
        components: [],
      });
    } catch (error) {
      thrown = error;
    }

    assert('training session insert failure is thrown', thrown === sessionError);
    assert('scheduled activity update happened before workload insert failure', calls.some((call) => call.table === 'scheduled_activities' && call.method === 'update'));
  }

  {
    const { supabase, calls } = createMockSupabase({ activityType: 'rest' });
    const { completeActivity } = loadScheduleService(supabase);

    await completeActivity('user-1', 'rest-activity', {
      actual_duration_min: 0,
      actual_rpe: 0,
      components: [],
    });

    assert('rest completion skips training_sessions by explicit rule', !calls.some((call) => call.table === 'training_sessions' && call.method === 'insert'));
    assert('rest completion still updates scheduled activity', calls.some((call) => call.table === 'scheduled_activities' && call.method === 'update'));
  }
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
