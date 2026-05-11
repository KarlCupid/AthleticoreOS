import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectVisibleAny,
  isVisible,
} from './helpers/assertions';
import { openTab, openTrainingTab } from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Workout Detail smoke', () => {
  skipIfNoAuthCredentials(test);

  test('support session detail opens and generated preview disclosure works when data exists', async ({ page }) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; WorkoutDetail smoke requires a ready user.`);

    await openTab(page, 'Train');

    const todaySupport = page.getByRole('button', { name: /Open support session/i });
    if (await isVisible(todaySupport, 1_000)) {
      await todaySupport.click();
    } else {
      await openTrainingTab(page, 'Week');
      const supportEntry = page.getByRole('button', { name: /support|roadwork|durability|strength|power|conditioning|mobility|minutes/i }).first();
      test.skip(
        !(await isVisible(supportEntry, 1_000)),
        'No support session or plan entry was visible for this E2E account.',
      );
      await supportEntry.click();
    }

    await expectVisibleAny(
      [
        page.getByText(/Session brief/i),
        page.getByText(/Today.?s work/i),
        page.getByText(/Build today's session/i),
        page.getByText(/Start session/i),
      ],
      'WorkoutDetail support session surface',
      20_000,
    );
    await expectNoDeveloperCopy(page);

    const buildButton = page.getByRole('button', { name: /Build today's session/i });
    if (await isVisible(buildButton, 1_000)) {
      await buildButton.click();
      await expectVisibleAny(
        [
          page.getByTestId('generated-workout-preview-card'),
          page.getByText(/Coach brief/i),
          page.getByText(/Safety notes|Review needed|Ready/i),
        ],
        'generated support-session detail after lazy build',
        30_000,
      );
    }

    test.skip(
      !(await isVisible(page.getByTestId('generated-workout-preview-card'), 1_000)),
      'No generated workout preview was available for this E2E account.',
    );

    await expect(page.getByText(/Focus/i).first()).toBeVisible();
    await expect(page.getByText(/Work/i).first()).toBeVisible();
    await expect(page.getByText(/Safety/i).first()).toBeVisible();
    await expect(page.getByText(/Coach brief/i)).toBeVisible();
    await expect(page.getByText(/Today.?s work/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Show workout details/i })).toBeVisible();

    await page.getByRole('button', { name: /Show workout details/i }).click();
    await expect(page.getByRole('button', { name: /Hide workout details/i })).toBeVisible();
    await expect(page.getByText(/Why this session|Session tags|Safety details/i).first()).toBeVisible();
    await expectNoDeveloperCopy(page);
  });
});
