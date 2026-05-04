import { redactSensitiveString, sanitizeMonitoringContext, type SanitizedValue } from '../observability/privacy';

type LogErrorSink = (scope: string, error: unknown, context?: Record<string, SanitizedValue>) => void;

let logErrorSink: LogErrorSink | null = null;

export function registerLogErrorSink(sink: LogErrorSink | null): void {
  logErrorSink = sink;
}

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
  const message = redactSensitiveString(getErrorMessage(error));
  const safeContext = context ? sanitizeMonitoringContext(context) : undefined;

  if (safeContext) {
    console.error(`[${scope}] ${message}`, safeContext);
  } else {
    console.error(`[${scope}] ${message}`);
  }

  if (logErrorSink) {
    try {
      logErrorSink(scope, error, safeContext);
    } catch (sinkError) {
      const sinkMessage = redactSensitiveString(getErrorMessage(sinkError));
      console.warn(`[logger.monitoringSink] ${sinkMessage}`);
    }
  }
}

export function logWarn(scope: string, warning: unknown, context?: Record<string, unknown>): void {
  const message = redactSensitiveString(getErrorMessage(warning));
  const safeContext = context ? sanitizeMonitoringContext(context) : undefined;

  if (safeContext) {
    console.warn(`[${scope}] ${message}`, safeContext);
    return;
  }

  console.warn(`[${scope}] ${message}`);
}
