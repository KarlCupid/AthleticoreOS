const path = require('node:path');
const fs = require('node:fs');

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
  completeActivityError?: unknown;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const supabase = {
    rpc(...args: unknown[]) {
      calls.push({ table: 'rpc', method: 'rpc', args });
      return Promise.resolve({ error: config.completeActivityError ?? null });
    },
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
        maybeSingle() {
          calls.push({ table, method: 'maybeSingle', args: [] });
          return Promise.resolve({
            data: {
              date: config.activityDate ?? '2026-04-29',
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

    const completionRpc = calls.find((call) => call.table === 'rpc' && call.args[0] === 'complete_scheduled_activity');
    assert('training activity delegates to transactional completion RPC', Boolean(completionRpc));
    assertEqual('completion RPC receives activity id', (completionRpc?.args[1] as any)?.p_activity_id, 'activity-1');
    assertEqual('completion RPC receives actual duration', (completionRpc?.args[1] as any)?.p_actual_duration_min, 60);
    assertEqual('completion RPC receives actual rpe', (completionRpc?.args[1] as any)?.p_actual_rpe, 7);
  }

  {
    const sessionError = new Error('training session insert failed');
    const { supabase, calls } = createMockSupabase({
      activityType: 'boxing_practice',
      completeActivityError: sessionError,
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
    assert('completion failure does not leave client-side partial writes', !calls.some((call) => call.method === 'update' || call.method === 'insert'));
  }

  {
    const { supabase, calls } = createMockSupabase({ activityType: 'rest' });
    const { completeActivity } = loadScheduleService(supabase);

    await completeActivity('user-1', 'rest-activity', {
      actual_duration_min: 0,
      actual_rpe: 0,
      components: [],
    });

    const completionRpc = calls.find((call) => call.table === 'rpc' && call.args[0] === 'complete_scheduled_activity');
    assert('rest completion delegates to transactional completion RPC', Boolean(completionRpc));
    assertEqual('rest completion RPC receives activity id', (completionRpc?.args[1] as any)?.p_activity_id, 'rest-activity');
  }

  {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'supabase', 'migrations', '032_complete_activity_returns_completed_row.sql'),
      'utf8',
    );

    assert('completion mutation is implemented as a Postgres transaction RPC', migration.includes('CREATE OR REPLACE FUNCTION public.complete_scheduled_activity'));
    assert('completion RPC accepts numeric RPE input', migration.includes('p_actual_rpe NUMERIC'));
    assert('completion RPC returns the completed activity row', migration.includes('RETURNS TABLE'));
    assert('completion transaction locks the scheduled activity row', migration.includes('FOR UPDATE'));
    assert('completion transaction writes activity_log inside the RPC', migration.includes('INSERT INTO public.activity_log'));
    assert('completion transaction writes ACWR workload inside the RPC', migration.includes('INSERT INTO public.training_sessions'));
    assert('completion transaction skips rest workload rows', migration.includes("IF v_activity.activity_type <> 'rest' THEN"));
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
