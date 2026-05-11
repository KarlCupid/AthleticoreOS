import { expect, type Page } from '@playwright/test';
import {
  expectNoImpossibleHorizontalOverflow,
  expectVisibleAny,
  isSmallViewport,
  isVisible,
} from './assertions';

export type AppEntryState =
  | 'auth'
  | 'onboarding'
  | 'trainingSetup'
  | 'main'
  | 'loadError'
  | 'unknown';

export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const text = document.body?.innerText?.trim() ?? '';
    return text.length > 0;
  }, null, { timeout: 35_000 });
  await page.waitForTimeout(250);
}

export async function gotoApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

export async function getAppEntryState(page: Page): Promise<AppEntryState> {
  if (await isVisible(page.getByText(/couldn.t load your athlete profile/i), 250)) {
    return 'loadError';
  }

  if (
    await isVisible(page.getByLabel('Email'), 250)
    && await isVisible(page.getByRole('button', { name: /^Sign in$/i }), 250)
  ) {
    return 'auth';
  }

  if (
    await isVisible(page.getByText(/Welcome to Athleticore|ATHLETICORE OS|Setup/i), 250)
    && await isVisible(page.getByTestId(/onboarding-(continue|submit)/), 250)
  ) {
    return 'onboarding';
  }

  if (await isVisible(page.getByText(/Update your journey plan|Training days|Weekly plan setup/i), 250)) {
    return 'trainingSetup';
  }

  if (
    await isVisible(page.getByTestId('tab-button-today'), 250)
    || await isVisible(page.getByText(/Today's Mission|TODAY'S READINESS|Training|Today's fuel/i), 250)
  ) {
    return 'main';
  }

  return 'unknown';
}

export async function dismissFirstRunSurfaces(page: Page): Promise<void> {
  const optionalControls = [
    page.getByTestId('first-run-not-now'),
    page.getByTestId('existing-user-overhaul-dismiss'),
    page.getByTestId('first-sign-in-tour-skip'),
    page.getByRole('button', { name: /Save walkthrough for later|Dismiss guided journey intro|Not now/i }),
  ];

  for (const control of optionalControls) {
    if (await isVisible(control, 500)) {
      await control.first().click();
      await page.waitForTimeout(250);
    }
  }
}

export async function openTab(page: Page, tab: 'Today' | 'Train' | 'Plan' | 'Fuel' | 'Me'): Promise<void> {
  const key = tab.toLowerCase();
  await expectVisibleAny(
    [
      page.getByTestId(`tab-button-${key}`),
      page.getByRole('button', { name: new RegExp(`${tab} tab`, 'i') }),
      page.getByText(tab, { exact: true }),
    ],
    `${tab} bottom tab`,
  );

  const tabButton = page.getByTestId(`tab-button-${key}`);
  if (await isVisible(tabButton, 500)) {
    await tabButton.click();
  } else {
    await page.getByRole('button', { name: new RegExp(`${tab} tab`, 'i') }).click();
  }
  await waitForAppReady(page);
}

export async function openTrainingTab(
  page: Page,
  label: 'Today' | 'Week' | 'Recent' | 'Progress',
): Promise<void> {
  await expectVisibleAny(
    [
      page.getByRole('button', { name: new RegExp(`${label} training tab`, 'i') }),
      page.getByText(label, { exact: true }),
    ],
    `${label} training subtab`,
  );
  await page.getByRole('button', { name: new RegExp(`${label} training tab`, 'i') }).click();
  await waitForAppReady(page);
}

export async function openWeightClass(page: Page): Promise<boolean> {
  await page.goto('/fuel/body-mass', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  if (
    await isVisible(page.getByText(/Weight-class context|Body-mass context|Safety review|Long-term management/i), 1_500)
  ) {
    return true;
  }

  await openTab(page, 'Fuel');
  const link = page.getByRole('button', { name: /Open weight-class context/i });
  if (await isVisible(link, 1_000)) {
    await link.click();
    await waitForAppReady(page);
    return await isVisible(
      page.getByText(/Weight-class context|Body-mass context|Safety review|Long-term management/i),
      2_000,
    );
  }

  return false;
}

export async function expectCoreScreenHealthy(page: Page): Promise<void> {
  await expect(page.locator('body')).toBeVisible();
  if (isSmallViewport(page)) {
    await expectNoImpossibleHorizontalOverflow(page);
  }
}
