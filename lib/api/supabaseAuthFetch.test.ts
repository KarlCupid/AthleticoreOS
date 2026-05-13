import { normalizeSupabaseAuthResponse } from './supabaseAuthFetch.ts';

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

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

async function run() {
  const supabaseUrl = 'https://project.supabase.co';

  console.log('\n-- supabase auth fetch normalization --');
  {
    const htmlOutage = new Response('<!DOCTYPE html><html>Connection timed out</html>', {
      headers: { 'content-type': 'text/plain', 'retry-after': '120' },
      status: 522,
      statusText: 'Connection timed out',
    });

    const normalized = normalizeSupabaseAuthResponse(
      'https://project.supabase.co/auth/v1/token?grant_type=password',
      htmlOutage,
      supabaseUrl,
    );
    const body = await readJson(normalized);

    assert('non-json auth outage keeps upstream status', normalized.status === 522);
    assert('non-json auth outage becomes json', normalized.headers.get('content-type')?.includes('application/json') === true);
    assert('non-json auth outage keeps retry hint', normalized.headers.get('retry-after') === '120');
    assert('non-json auth outage gets stable error code', body.code === 'auth_service_unavailable');
  }

  {
    const jsonAuthError = new Response(JSON.stringify({ message: 'Invalid login credentials' }), {
      headers: { 'content-type': 'application/json;charset=UTF-8' },
      status: 400,
    });

    const normalized = normalizeSupabaseAuthResponse(
      'https://project.supabase.co/auth/v1/token?grant_type=password',
      jsonAuthError,
      supabaseUrl,
    );

    assert('json auth errors are left alone', normalized === jsonAuthError);
  }

  {
    const htmlRestError = new Response('<!DOCTYPE html><html>Gateway error</html>', {
      headers: { 'content-type': 'text/html' },
      status: 502,
    });

    const normalized = normalizeSupabaseAuthResponse(
      'https://project.supabase.co/rest/v1/profiles',
      htmlRestError,
      supabaseUrl,
    );

    assert('non-auth responses are left alone', normalized === htmlRestError);
  }
}

run().catch((error) => {
  failed += 1;
  console.error(error);
}).finally(() => {
  if (failed > 0) {
    console.error(`\n${failed} supabase auth fetch test(s) failed.`);
    process.exit(1);
  }

  console.log(`\n${passed} supabase auth fetch test(s) passed.`);
});
