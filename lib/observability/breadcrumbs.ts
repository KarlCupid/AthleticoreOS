import { sanitizeMonitoringContext, type SanitizedValue } from './privacy';

export type MonitoringBreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

export interface MonitoringBreadcrumb {
  category: string;
  message: string;
  level: MonitoringBreadcrumbLevel;
  data?: Record<string, SanitizedValue> | undefined;
}

type BreadcrumbSink = (breadcrumb: MonitoringBreadcrumb) => void;
type RouteSink = (routeName: string | null) => void;

let breadcrumbSink: BreadcrumbSink | null = null;
let routeSink: RouteSink | null = null;
let currentRouteName: string | null = null;

export function registerMonitoringBreadcrumbSink(sink: BreadcrumbSink | null): void {
  breadcrumbSink = sink;
}

export function registerMonitoringRouteSink(sink: RouteSink | null): void {
  routeSink = sink;
}

export function getCurrentMonitoringRoute(): string | null {
  return currentRouteName;
}

export function setCurrentMonitoringRoute(routeName: string | null | undefined): void {
  const nextRoute = routeName ?? null;
  if (nextRoute === currentRouteName) {
    return;
  }

  const previousRoute = currentRouteName;
  currentRouteName = nextRoute;
  routeSink?.(currentRouteName);

  if (nextRoute) {
    addMonitoringBreadcrumb('navigation', 'screen_changed', {
      from: previousRoute,
      to: nextRoute,
    });
  }
}

export function addMonitoringBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: MonitoringBreadcrumbLevel = 'info',
): void {
  const breadcrumb: MonitoringBreadcrumb = {
    category,
    message,
    level,
    data: data ? sanitizeMonitoringContext(data) : undefined,
  };

  breadcrumbSink?.(breadcrumb);
}
