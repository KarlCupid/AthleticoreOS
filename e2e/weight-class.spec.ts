import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectNoImpossibleHorizontalOverflow,
  isSmallViewport,
  isVisible,
} from './helpers/assertions';
import { openWeightClass } from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Weight Class smoke', () => {
  skipIfNoAuthCredentials(test);

  test('weight-class context leads with safe available actions', async ({ page }) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; Weight Class smoke requires a ready user.`);

    test.skip(
      !(await openWeightClass(page)),
      'Weight-class context was not reachable for this E2E account.',
    );

    await expect(
      page.getByText(/Weight-class context|Body-mass context|Safety review|Long-term management/i).first(),
    ).toBeVisible();

    const evaluate = page.getByRole('button', { name: /Evaluate weight class/i });
    if (await isVisible(evaluate, 750)) {
      await expect(page.getByText(/Weight-class context/i)).toBeVisible();
      await expect(evaluate).toBeVisible();
    }

    const saferOptions = page.getByRole('button', { name: /Review safer options/i });
    if (await isVisible(saferOptions, 750)) {
      const safetyBox = page.getByText(/Safety|Support paused|Blocked for safety|Professional review/i).first();
      await expect(safetyBox).toBeVisible();
      await expect(saferOptions).toBeVisible();
      await expect(page.getByText(/Scale numbers are secondary/i)).toBeVisible();
    }

    await expect(page.getByText(/\bAthletiCore\b/)).toHaveCount(0);
    await expectNoDeveloperCopy(page);

    if (isSmallViewport(page)) {
      await expectNoImpossibleHorizontalOverflow(page);
    }
  });
});
