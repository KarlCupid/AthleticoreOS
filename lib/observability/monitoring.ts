import type { ComponentType } from 'react';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

import {
  getCurrentMonitoringRoute,
  registerMonitoringBreadcrumbSink,
  registerMonitoringRouteSink,
  addMonitoringBreadcrumb,
} from './breadcrumbs';
import {
  isNetworkLikeError,
  redactSensitiveString,
  sanitizeMonitoringContext,
  sanitizeUnknown,
  sanitizeUrl,
} from './privacy';
import { getErrorMessage, registerLogErrorSink } from '../utils/logger';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let initialized = false;
let monitoringEnabled = false;
let fetchPatched = false;
let previewTestErrorCaptured = false;

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function isDisabled(value: string | undefined): boolean {
  return value === '0' || value === 'false' || value === 'off' || value === 'disabled';
}

function getExpoConfigExtra(): Record<string, unknown> {
  const extra = Constants.expoConfig?.extra;
  return extra && typeof extra === 'object' ? extra as Record<string, unknown> : {};
}

function getBuildProfile(): string {
  const extra = getExpoConfigExtra();
  const extraProfile = typeof extra.buildProfile === 'string' ? extra.buildProfile : undefined;

  return process.env.EXPO_PUBLIC_BUILD_PROFILE
    ?? extraProfile
    ?? (typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production');
}

function getBuildNumber(): string {
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  return iosBuildNumber ?? (androidVersionCode != null ? String(androidVersionCode) : 'unknown');
}

function getMonitoringDsn(): string {
  return process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
}

function shouldEnableMonitoring(): boolean {
  const dsn = getMonitoringDsn();
  if (!dsn) {
    return false;
  }

  if (isTruthy(process.env.EXPO_PUBLIC_MONITORING_DISABLED)) {
    return false;
  }

  const enabledFlag = process.env.EXPO_PUBLIC_MONITORING_ENABLED;
  if (isDisabled(enabledFlag)) {
    return false;
  }

  if (isTruthy(enabledFlag)) {
    return true;
  }

  return !(typeof __DEV__ !== 'undefined' && __DEV__);
}

function toMonitoringError(scope: string, error: unknown): Error {
  const original = error instanceof Error ? error : null;
  const safeMessage = scope === 'observability.previewTestError'
    ? 'Athleticore preview monitoring test error'
    : buildMonitoringErrorDescriptor(error);
  const nextError = new Error(`[${scope}] ${safeMessage}`);
  nextError.name = original?.name ? redactSensitiveString(original.name) : 'Error';

  if (original?.stack) {
    const stackFrames = original.stack.split('\n').slice(1).join('\n');
    nextError.stack = `${nextError.name}: ${nextError.message}${stackFrames ? `\n${stackFrames}` : ''}`;
  }

  return nextError;
}

function buildMonitoringErrorDescriptor(error: unknown): string {
  const maybeObject = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const name = error instanceof Error && error.name ? error.name : 'Error';
  const code = typeof maybeObject.code === 'string' ? maybeObject.code : null;
  const status = typeof maybeObject.status === 'number' ? maybeObject.status : null;

  if (isNetworkLikeError(error)) {
    return code ? `Network error (${redactSensitiveString(code)})` : 'Network error';
  }

  if (code) {
    return `${redactSensitiveString(name)} (${redactSensitiveString(code)})`;
  }

  if (status) {
    return `${redactSensitiveString(name)} (status ${status})`;
  }

  return redactSensitiveString(name);
}

function sanitizeSentryPayload<T>(payload: T): T {
  return sanitizeUnknown(payload, 6) as T;
}

function captureMonitoringError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  if (!monitoringEnabled) {
    return;
  }

  const routeName = getCurrentMonitoringRoute();
  const safeContext = sanitizeMonitoringContext({
    ...(context ?? {}),
    routeName,
    errorScope: scope,
    networkLike: isNetworkLikeError(error),
  });

  Sentry.withScope((sentryScope) => {
    sentryScope.setTag('error.scope', scope);
    sentryScope.setTag('error.network_like', String(isNetworkLikeError(error)));
    if (routeName) {
      sentryScope.setTag('route.screen', routeName);
    }
    sentryScope.setContext('athleticore', safeContext);
    Sentry.captureException(toMonitoringError(scope, error));
  });
}

function updateRouteScope(routeName: string | null): void {
  if (!monitoringEnabled) {
    return;
  }

  if (routeName) {
    Sentry.setTag('route.screen', routeName);
    Sentry.setContext('route', { screen: routeName });
    return;
  }

  Sentry.setTag('route.screen', 'unknown');
  Sentry.setContext('route', { screen: 'unknown' });
}

function getFetchMetadata(input: FetchInput, init?: FetchInit): { method: string; url: string; sentryRequest: boolean } {
  const requestLike = input as { method?: unknown; url?: unknown };
  const method = typeof init?.method === 'string'
    ? init.method
    : typeof requestLike.method === 'string'
      ? requestLike.method
      : 'GET';
  const rawUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : typeof requestLike.url === 'string'
        ? requestLike.url
        : String(input);
  const url = sanitizeUrl(rawUrl);

  return {
    method: method.toUpperCase(),
    url,
    sentryRequest: /sentry\.io|ingest\./i.test(rawUrl),
  };
}

function installFetchFailureInstrumentation(): void {
  if (fetchPatched || typeof fetch !== 'function') {
    return;
  }

  const originalFetch = fetch.bind(globalThis);
  fetchPatched = true;

  globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => {
    const metadata = getFetchMetadata(input, init);

    try {
      const response = await originalFetch(input, init);

      if (!metadata.sentryRequest && response.status >= 500) {
        captureMonitoringError('network.httpResponse', new Error(`HTTP ${response.status} response`), {
          method: metadata.method,
          url: metadata.url,
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      if (!metadata.sentryRequest) {
        captureMonitoringError('network.fetch', error, {
          method: metadata.method,
          url: metadata.url,
        });
      }

      throw error;
    }
  }) as typeof fetch;
}

export function initializeMonitoring(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  monitoringEnabled = shouldEnableMonitoring();
  registerLogErrorSink(captureMonitoringError);
  registerMonitoringBreadcrumbSink((breadcrumb) => {
    if (!monitoringEnabled) {
      return;
    }

    const sentryBreadcrumb: Sentry.Breadcrumb = {
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level,
    };

    if (breadcrumb.data) {
      sentryBreadcrumb.data = breadcrumb.data;
    }

    Sentry.addBreadcrumb(sentryBreadcrumb);
  });
  registerMonitoringRouteSink(updateRouteScope);

  if (!monitoringEnabled) {
    return;
  }

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const buildProfile = getBuildProfile();
  const buildNumber = getBuildNumber();

  try {
    Sentry.init({
      dsn: getMonitoringDsn(),
      enabled: true,
      environment: buildProfile,
      release: `athleticore-os@${appVersion}`,
      dist: buildNumber || 'unknown',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console') {
          return null;
        }

        return sanitizeSentryPayload(breadcrumb);
      },
      beforeSend(event) {
        const sanitized = sanitizeSentryPayload(event);
        delete sanitized.user;
        return sanitized;
      },
    });
  } catch (error) {
    monitoringEnabled = false;
    console.warn('[monitoring.initialize] Sentry initialization failed', redactSensitiveString(getErrorMessage(error)));
    return;
  }

  Sentry.setTag('app.version', appVersion);
  Sentry.setTag('build.profile', buildProfile);
  Sentry.setTag('build.number', buildNumber || 'unknown');
  Sentry.setContext('app', sanitizeMonitoringContext({
    appVersion,
    buildProfile,
    buildNumber,
    appName: Constants.expoConfig?.name ?? 'AthletiCore OS',
    appSlug: Constants.expoConfig?.slug ?? 'athleticore-os',
  }));
  Sentry.setUser(null);

  installFetchFailureInstrumentation();
  addMonitoringBreadcrumb('app', 'monitoring_initialized', {
    appVersion,
    buildProfile,
    buildNumber,
  });
}

export function wrapRootComponent<P>(
  RootComponent: ComponentType<P>,
): ComponentType<P> {
  if (!monitoringEnabled) {
    return RootComponent;
  }

  return Sentry.wrap(RootComponent as ComponentType<Record<string, unknown>>) as ComponentType<P>;
}

export function capturePreviewMonitoringTestError(): void {
  if (previewTestErrorCaptured || !monitoringEnabled || !isTruthy(process.env.EXPO_PUBLIC_MONITORING_TEST_ERROR)) {
    return;
  }

  previewTestErrorCaptured = true;
  captureMonitoringError('observability.previewTestError', new Error('Athleticore preview monitoring test error'), {
    forced: true,
    buildProfile: getBuildProfile(),
  });
}

initializeMonitoring();
