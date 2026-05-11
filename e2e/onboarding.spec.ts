import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectNoImpossibleHorizontalOverflow,
  isSmallViewport,
} from './helpers/assertions';
import { getAppEntryState, gotoApp } from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Onboarding smoke', () => {
  test('signed-out users stay on auth instead of a public onboarding route', async ({ page }) => {
    await gotoApp(page, '/onboarding');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
    await expectNoDeveloperCopy(page);
  });

  test.describe('authenticated onboarding', () => {
    skipIfNoAuthCredentials(test);

    test('welcome and early goal steps expose expected athlete copy', async ({ page }) => {
      const state = await signInWithEnvUser(page);
      test.skip(
        state !== 'onboarding',
        `The configured E2E user landed in ${state}; use a fresh user that still needs onboarding for this smoke.`,
      );

      await expect(page.getByText(/Welcome to Athleticore/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
      await expectNoDeveloperCopy(page);

      await page.getByRole('button', { name: /Continue/i }).click();
      await expect(page.getByText(/Start with where you are now/i)).toBeVisible();
      await expect(page.getByText(/Use male-based defaults/i)).toBeVisible();
      await expect(page.getByText(/Use female-based defaults/i)).toBeVisible();
      await expect(page.getByText(/Protect boxing practice/i)).toBeVisible();

      await page.getByPlaceholder('25').focus();
      await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
      await expectNoDeveloperCopy(page);

      if (isSmallViewport(page)) {
        await expectNoImpossibleHorizontalOverflow(page);
      }

      expect(await getAppEntryState(page)).toBe('onboarding');
    });
  });
});
