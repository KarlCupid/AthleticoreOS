import { expect, type Page } from '@playwright/test';
import { expectVisibleAny, getVisiblePageText } from './assertions';
import {
  dismissFirstRunSurfaces,
  getAppEntryState,
  gotoApp,
  waitForAppReady,
  type AppEntryState,
} from './app';

export interface E2EAuthCredentials {
  email: string;
  password: string;
}

export function getAuthCredentials(): E2EAuthCredentials | null {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

export function hasAuthCredentials(): boolean {
  return getAuthCredentials() !== null;
}

export function skipIfNoAuthCredentials(testInstance: { skip: (condition: boolean, description: string) => void }): void {
  testInstance.skip(
    !hasAuthCredentials(),
    'Set E2E_EMAIL and E2E_PASSWORD to run authenticated Expo web smoke tests.',
  );
}

export async function signInWithEnvUser(page: Page): Promise<AppEntryState> {
  const credentials = getAuthCredentials();
  if (!credentials) {
    throw new Error('Missing E2E_EMAIL and E2E_PASSWORD.');
  }

  await gotoApp(page);
  const initialState = await getAppEntryState(page);
  if (initialState !== 'auth') {
    await dismissFirstRunSurfaces(page);
    return initialState;
  }

  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    await waitForAppReady(page);
    const state = await getAppEntryState(page);
    if (state !== 'auth' && state !== 'unknown') {
      await dismissFirstRunSurfaces(page);
      return state;
    }
    await page.waitForTimeout(500);
  }

  const visibleText = await getVisiblePageText(page);
  throw new Error(`Sign-in did not reach the app shell. Visible UI: ${visibleText.slice(0, 500)}`);
}

export async function maybeSignIn(page: Page): Promise<AppEntryState> {
  if (!hasAuthCredentials()) {
    await gotoApp(page);
    return getAppEntryState(page);
  }
  return signInWithEnvUser(page);
}

export async function expectSignedInMainApp(page: Page): Promise<void> {
  await expectVisibleAny(
    [
      page.getByTestId('tab-button-today'),
      page.getByText(/Today's Mission|TODAY'S READINESS/i),
    ],
    'signed-in main app shell',
  );
}
