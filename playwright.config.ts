import { defineConfig, devices } from '@playwright/test';

const DEFAULT_WEB_PORT = 8081;
const webPort = Number(process.env.E2E_WEB_PORT ?? DEFAULT_WEB_PORT);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const webServerToken =
  process.env.E2E_WEBSERVER_TOKEN ??
  `athleticore-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;

process.env.E2E_WEBSERVER_TOKEN = webServerToken;

const webServerEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    webServerEnv[key] = value;
  }
}

Object.assign(webServerEnv, {
  BROWSER: 'none',
  CI: '1',
  E2E_WEBSERVER_TOKEN: webServerToken,
  EXPO_NO_TELEMETRY: '1',
  EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED:
    process.env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED ?? '1',
  EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA:
    process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA ?? '0',
  EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW:
    process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW ?? '0',
});

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 12_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `node ./scripts/start-expo-web-e2e.js --port ${webPort}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    gracefulShutdown: { signal: 'SIGINT', timeout: 500 },
    env: webServerEnv,
  },
  projects: [
    {
      name: 'chromium desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'chromium mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
      },
    },
  ],
});
