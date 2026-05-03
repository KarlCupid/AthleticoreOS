function isLocalSupabaseUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1'
      || hostname.endsWith('.local');
  } catch {
    return false;
  }
}

const REMOTE_NON_PRODUCTION_FLAG = 'WORKOUT_SUPABASE_NON_PRODUCTION';

function normalizeComparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(value || '').trim().replace(/\/$/, '').toLowerCase();
  }
}

function supabaseProjectRefFromUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.endsWith('.supabase.co')
      ? hostname.slice(0, -'.supabase.co'.length)
      : null;
  } catch {
    return null;
  }
}

function looksProductionLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized.includes('non-production')
    || normalized.includes('nonproduction')
    || normalized.includes('non_prod')
    || normalized.includes('non-prod')
  ) {
    return false;
  }

  return /(^|[^a-z0-9])prod(uction)?($|[^a-z0-9])/.test(normalized);
}

function productionTargetBlocker(input) {
  const env = input.env || process.env;
  const supabaseUrl = input.supabaseUrl;
  const targetUrl = supabaseUrl ? normalizeComparableUrl(supabaseUrl) : null;
  const targetProjectRef = targetProjectRefFromEnv(env, supabaseUrl);
  const productionUrls = [
    env.WORKOUT_PRODUCTION_SUPABASE_URL,
    env.PRODUCTION_SUPABASE_URL,
    env.EXPO_PUBLIC_PRODUCTION_SUPABASE_URL,
  ].filter(Boolean);
  const productionRefs = [
    env.WORKOUT_PRODUCTION_SUPABASE_PROJECT_REF,
    env.PRODUCTION_SUPABASE_PROJECT_REF,
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase());

  for (const productionUrl of productionUrls) {
    if (targetUrl && normalizeComparableUrl(productionUrl) === targetUrl) {
      return [
        `Refusing to run ${input.label.toLowerCase()} because the Supabase URL matches a configured production URL.`,
        'Use a local instance or a dedicated non-production test project.',
      ].join('\n');
    }
  }

  if (targetProjectRef && productionRefs.includes(targetProjectRef)) {
    return [
      `Refusing to run ${input.label.toLowerCase()} because the Supabase project ref matches a configured production project ref.`,
      'Use a local instance or a dedicated non-production test project.',
    ].join('\n');
  }

  const targetLabels = [
    env.WORKOUT_SUPABASE_TARGET_LABEL,
    env.WORKOUT_SUPABASE_ENVIRONMENT,
    env.SUPABASE_ENVIRONMENT,
    env.WORKOUT_SUPABASE_PROJECT_REF,
    env.SUPABASE_PROJECT_REF,
    targetProjectRef,
  ].filter(Boolean);

  if (targetLabels.some(looksProductionLabel)) {
    return [
      `Refusing to run ${input.label.toLowerCase()} because the Supabase target is labelled production.`,
      'Rename the live-test target or use a dedicated non-production test project.',
    ].join('\n');
  }

  return null;
}

function targetProjectRefFromEnv(env, supabaseUrl) {
  const explicitRef = env.WORKOUT_SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;
  if (explicitRef) {
    return String(explicitRef).trim().toLowerCase();
  }

  return supabaseUrl ? supabaseProjectRefFromUrl(supabaseUrl) : null;
}

function liveDbTestBlocker(input) {
  const env = input.env || process.env;
  const supabaseUrl = input.supabaseUrl;

  if (env[input.enableFlag] !== '1') {
    return [
      `${input.label} are disabled.`,
      `Set ${input.enableFlag}=1 to run against a local or dedicated test Supabase instance.`,
    ].join('\n');
  }

  if (!supabaseUrl) {
    return null;
  }

  const productionBlocker = productionTargetBlocker(input);
  if (productionBlocker) {
    return productionBlocker;
  }

  if (!isLocalSupabaseUrl(supabaseUrl) && env[input.allowRemoteFlag] !== '1') {
    return [
      `Refusing to run ${input.label.toLowerCase()} against remote Supabase URL: ${supabaseUrl}`,
      `Use a local instance, or set ${input.allowRemoteFlag}=1 only for a dedicated non-production test project.`,
    ].join('\n');
  }

  if (!isLocalSupabaseUrl(supabaseUrl) && env[REMOTE_NON_PRODUCTION_FLAG] !== '1') {
    return [
      `Refusing to run ${input.label.toLowerCase()} against a remote Supabase URL without ${REMOTE_NON_PRODUCTION_FLAG}=1.`,
      `Set ${REMOTE_NON_PRODUCTION_FLAG}=1 only for a dedicated non-production test project.`,
    ].join('\n');
  }

  return null;
}

function assertLiveDbTestAllowed(input) {
  const blocker = liveDbTestBlocker(input);
  if (blocker) {
    console.error(blocker);
    process.exit(1);
  }
}

module.exports = {
  assertLiveDbTestAllowed,
  isLocalSupabaseUrl,
  liveDbTestBlocker,
  productionTargetBlocker,
};
