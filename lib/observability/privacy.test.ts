import {
  REDACTED,
  REDACTED_ID,
  isNetworkLikeError,
  sanitizeMonitoringContext,
  sanitizeUrl,
} from './privacy.ts';

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

console.log('\n-- observability privacy guards --');

(() => {
  const context = sanitizeMonitoringContext({
    routeName: 'Dashboard',
    errorScope: 'App.authSessionLookup',
    email: 'athlete@example.com',
    userId: '8b88a877-6ea2-4c88-a3f8-2b1f5524a111',
    morningWeight: 151.4,
    nutritionLog: [{ food_name: 'private meal', calories: 650 }],
    notes: 'felt dizzy during warmups',
    scanLength: 12,
  });

  assert('safe route context is preserved', context.routeName === 'Dashboard');
  assert('safe error scope is preserved', context.errorScope === 'App.authSessionLookup');
  assert('email is redacted', context.email === REDACTED);
  assert('user id is redacted', context.userId === REDACTED_ID);
  assert('body-mass values are redacted', context.morningWeight === REDACTED);
  assert('raw nutrition logs are redacted', context.nutritionLog === REDACTED);
  assert('health-sensitive notes are redacted', context.notes === REDACTED);
  assert('non-sensitive scan length is preserved', context.scanLength === 12);
})();

(() => {
  const context = sanitizeMonitoringContext({
    message: 'Reset link sent to boxer@example.com with Bearer abc.def.ghi',
  });

  assert('emails in strings are scrubbed', String(context.message).includes('[redacted-email]'));
  assert('bearer tokens in strings are scrubbed', String(context.message).includes('Bearer [redacted-token]'));
})();

(() => {
  assert(
    'urls drop query strings before breadcrumbs',
    sanitizeUrl('https://example.supabase.co/rest/v1/table?user_id=abc&email=a@example.com') === 'https://example.supabase.co/rest/v1/table',
  );
  assert('network-like errors are classified', isNetworkLikeError(new Error('Network request failed')));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
