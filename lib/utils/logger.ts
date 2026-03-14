export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }

  return 'Unknown error';
}

export function logError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  const message = getErrorMessage(error);
  if (context) {
    console.error(`[${scope}] ${message}`, context);
    return;
  }

  console.error(`[${scope}] ${message}`);
}

export function logWarn(scope: string, warning: unknown, context?: Record<string, unknown>): void {
  const message = getErrorMessage(warning);
  if (context) {
    console.warn(`[${scope}] ${message}`, context);
    return;
  }

  console.warn(`[${scope}] ${message}`);
}
