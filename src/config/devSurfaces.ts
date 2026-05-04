export type PublicBuildProfile = 'development' | 'preview' | 'production' | (string & {});

export interface DevSurfaceEnvironment {
  dev?: boolean;
  buildProfile?: string | undefined;
}

export function normalizePublicBuildProfile(buildProfile: string | undefined): PublicBuildProfile {
  const normalized = buildProfile?.trim().toLowerCase();
  if (normalized === 'preview' || normalized === 'production' || normalized === 'development') {
    return normalized;
  }

  return 'development';
}

export function isDevelopmentBuildProfile(buildProfile: string | undefined): boolean {
  return normalizePublicBuildProfile(buildProfile) === 'development';
}

export function isInternalDevSurfaceEnabled({
  dev = false,
  buildProfile,
}: DevSurfaceEnvironment): boolean {
  return dev === true && isDevelopmentBuildProfile(buildProfile);
}

export function isEngineReplayLabEnabled(environment: DevSurfaceEnvironment): boolean {
  return isInternalDevSurfaceEnabled(environment);
}
