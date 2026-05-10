export interface BoxingSAndCEngineFlags {
  engineEnabled: boolean;
  diagnosticsEnabled: boolean;
  previewContentAllowed: boolean;
  productionContentRequired: boolean;
  internalPreviewEnabled: boolean;
}

function enabled(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  return true;
}

export function resolveBoxingSAndCEngineFlags(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): BoxingSAndCEngineFlags {
  const diagnosticsEnabled = enabled(env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_DIAGNOSTICS, false);
  const internalPreviewEnabled = enabled(env.EXPO_PUBLIC_WORKOUT_DEV_PREVIEW_ENABLED, false);
  return {
    engineEnabled: enabled(env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED, true),
    diagnosticsEnabled,
    previewContentAllowed: diagnosticsEnabled || internalPreviewEnabled,
    productionContentRequired: !diagnosticsEnabled && !internalPreviewEnabled,
    internalPreviewEnabled,
  };
}

export const resolveAthleticoreSupportEngineFlags = resolveBoxingSAndCEngineFlags;
