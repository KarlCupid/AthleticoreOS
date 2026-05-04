import {
  PASSWORD_REQUIREMENT_COPY,
  getSupabaseAuthErrorCopy,
  normalizeEmail,
  parsePasswordRecoveryLink,
  validateEmailAndPassword,
  validateNewPassword,
  validatePasswordResetEmail,
} from './authUx.ts';

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

console.log('\n-- auth ux normalization and validation --');
{
  assert('email is trimmed and lower-cased', normalizeEmail('  KARL@EXAMPLE.COM ') === 'karl@example.com');

  const missingEmail = validateEmailAndPassword('', 'password');
  assert('empty email fails locally', missingEmail.errors.email === 'Enter your email address.');
  assert('invalid email fails locally', validatePasswordResetEmail('not-an-email').errors.email === 'Enter a valid email address.');
  assert('too-short password fails locally', validateEmailAndPassword('karl@example.com', '123').errors.password === PASSWORD_REQUIREMENT_COPY);
  assert('valid credentials pass with normalized email', (() => {
    const result = validateEmailAndPassword(' KARL@EXAMPLE.COM ', '123456');
    return result.valid && result.normalizedEmail === 'karl@example.com';
  })());

  const mismatch = validateNewPassword('123456', '654321');
  assert('mismatched reset passwords fail locally', mismatch.confirmPassword === 'Passwords do not match.');
}

console.log('\n-- auth ux error copy --');
{
  assert(
    'invalid credentials get user-safe copy',
    getSupabaseAuthErrorCopy({ message: 'Invalid login credentials' }, 'signIn') === 'That email and password do not match. Check both and try again.',
  );
  assert(
    'existing account sign-up gets recovery hint',
    getSupabaseAuthErrorCopy({ message: 'User already registered' }, 'signUp') === 'An account already exists for this email. Sign in or reset your password.',
  );
  assert(
    'expired reset token gets reset-specific copy',
    getSupabaseAuthErrorCopy({ message: 'Token has expired or is invalid' }, 'passwordUpdate') === 'That reset link expired. Request a new password reset email.',
  );
}

console.log('\n-- password recovery link parsing --');
{
  const parsed = parsePasswordRecoveryLink(
    'athleticore://auth/reset-password#access_token=access&refresh_token=refresh&type=recovery',
  );
  assert('recovery link returns access token', parsed?.accessToken === 'access');
  assert('recovery link returns refresh token', parsed?.refreshToken === 'refresh');
  assert('non-recovery app link is ignored', parsePasswordRecoveryLink('athleticore://today') === null);
  assert(
    'non-recovery token link is ignored',
    parsePasswordRecoveryLink('athleticore://auth/callback#access_token=access&refresh_token=refresh&type=signup') === null,
  );
}

if (failed > 0) {
  console.error(`\n${failed} auth ux test(s) failed.`);
  process.exit(1);
}

console.log(`\n${passed} auth ux test(s) passed.`);
