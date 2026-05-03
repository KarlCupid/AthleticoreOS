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

  if (!isLocalSupabaseUrl(supabaseUrl) && env[input.allowRemoteFlag] !== '1') {
    return [
      `Refusing to run ${input.label.toLowerCase()} against remote Supabase URL: ${supabaseUrl}`,
      `Use a local instance, or set ${input.allowRemoteFlag}=1 only for a dedicated non-production test project.`,
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
};
