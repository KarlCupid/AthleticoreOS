export const AUTH_PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_REQUIREMENT_COPY = `Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`;
export const PASSWORD_RECOVERY_REDIRECT_URL = 'athleticore://auth/reset-password';

export type AuthOperation =
  | 'signIn'
  | 'signUp'
  | 'passwordResetRequest'
  | 'passwordUpdate'
  | 'signOut'
  | 'deleteAccount';

export interface AuthFieldErrors {
  email?: string | undefined;
  password?: string | undefined;
  confirmPassword?: string | undefined;
}

export interface AuthCredentialValidation {
  normalizedEmail: string;
  errors: AuthFieldErrors;
  valid: boolean;
}

export interface PasswordRecoveryLinkParams {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  type: string | null;
  error: string | null;
  errorDescription: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getEmailValidationError(value: string): string | undefined {
  const normalizedEmail = normalizeEmail(value);
  if (!normalizedEmail) {
    return 'Enter your email address.';
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Enter a valid email address.';
  }

  return undefined;
}

export function getPasswordValidationError(value: string): string | undefined {
  if (!value) {
    return 'Enter your password.';
  }

  if (value.length < AUTH_PASSWORD_MIN_LENGTH) {
    return PASSWORD_REQUIREMENT_COPY;
  }

  return undefined;
}

export function validateEmailAndPassword(email: string, password: string): AuthCredentialValidation {
  const normalizedEmail = normalizeEmail(email);
  const errors: AuthFieldErrors = {
    email: getEmailValidationError(email),
    password: getPasswordValidationError(password),
  };

  return {
    normalizedEmail,
    errors,
    valid: !errors.email && !errors.password,
  };
}

export function validatePasswordResetEmail(email: string): AuthCredentialValidation {
  const normalizedEmail = normalizeEmail(email);
  const errors: AuthFieldErrors = {
    email: getEmailValidationError(email),
  };

  return {
    normalizedEmail,
    errors,
    valid: !errors.email,
  };
}

export function validateNewPassword(password: string, confirmPassword: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {
    password: getPasswordValidationError(password),
  };

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return String(error ?? '');
}

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return '';
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }

  return null;
}

export function getSupabaseAuthErrorCopy(error: unknown, operation: AuthOperation): string {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();
  const code = getErrorCode(error).toLowerCase();
  const status = getErrorStatus(error);

  if (status === 429 || code.includes('rate_limit') || lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return 'Too many attempts. Wait a minute, then try again.';
  }

  if (code.includes('invalid_credentials') || lowerMessage.includes('invalid login credentials')) {
    return 'That email and password do not match. Check both and try again.';
  }

  if (code.includes('email_not_confirmed') || lowerMessage.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for the confirmation link.';
  }

  if (code.includes('user_already_exists') || lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return 'An account already exists for this email. Sign in or reset your password.';
  }

  if (code.includes('weak_password') || lowerMessage.includes('password should be') || lowerMessage.includes('weak password')) {
    return `Your password needs to be stronger. ${PASSWORD_REQUIREMENT_COPY}`;
  }

  if (code.includes('validation_failed') || lowerMessage.includes('invalid email')) {
    return 'Enter a valid email address.';
  }

  if (lowerMessage.includes('signup') && lowerMessage.includes('disabled')) {
    return 'Account creation is currently unavailable. Contact support if you need access.';
  }

  if (lowerMessage.includes('token') && (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))) {
    return 'That reset link expired. Request a new password reset email.';
  }

  if (
    lowerMessage.includes('network request failed')
    || lowerMessage.includes('fetch failed')
    || lowerMessage.includes('failed to fetch')
  ) {
    return 'We could not reach AthletiCore right now. Check your connection and try again.';
  }

  switch (operation) {
    case 'signIn':
      return 'We could not sign you in right now. Check your details and try again.';
    case 'signUp':
      return 'We could not create your account right now. Try again in a moment.';
    case 'passwordResetRequest':
      return 'We could not send a reset link right now. Try again in a moment.';
    case 'passwordUpdate':
      return 'We could not update your password right now. Try the reset link again.';
    case 'signOut':
      return 'We could not sign you out right now. Try again in a moment.';
    case 'deleteAccount':
      return 'We could not delete your account right now. Try again in a moment.';
  }
}

function appendParams(target: URLSearchParams, value: string): void {
  const params = new URLSearchParams(value.replace(/^[?#]/, ''));
  params.forEach((paramValue, key) => {
    target.set(key, paramValue);
  });
}

export function parsePasswordRecoveryLink(url: string): PasswordRecoveryLinkParams | null {
  const params = new URLSearchParams();

  try {
    const parsed = new URL(url);
    appendParams(params, parsed.search);
    appendParams(params, parsed.hash);
  } catch {
    const queryIndex = url.indexOf('?');
    const hashIndex = url.indexOf('#');
    if (queryIndex >= 0) {
      const queryEnd = hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : undefined;
      appendParams(params, url.slice(queryIndex, queryEnd));
    }
    if (hashIndex >= 0) {
      appendParams(params, url.slice(hashIndex));
    }
  }

  const type = params.get('type');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const recoveryPath = url.toLowerCase().includes('reset-password');
  const isRecoveryLink = recoveryPath || type === 'recovery';

  if (!isRecoveryLink) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    code,
    type,
    error,
    errorDescription,
  };
}
