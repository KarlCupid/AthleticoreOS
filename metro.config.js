const { getSentryExpoConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

const { resolver } = config;

// Force Metro to resolve the subdirectory entry points for react-native-gifted-charts
config.resolver.sourceExts = [...resolver.sourceExts, 'js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];

// Enable modern package exports if needed (often fixes newer library path issues)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
