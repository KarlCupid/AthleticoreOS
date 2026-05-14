import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectNoImpossibleHorizontalOverflow,
  expectVisibleAny,
  getVisiblePageText,
  isSmallViewport,
  isVisible,
} from './helpers/assertions';
import { openTab, openTrainingTab } from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Train smoke', () => {
  skipIfNoAuthCredentials(test);

  test('Train Today exposes the main support surface without duplicate builder copy', async ({ page }) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; Train smoke requires a ready user.`);

    await openTab(page, 'Train');
    await expect(page.getByText('Training').first()).toBeVisible();

    await expectVisibleAny(
      [
        page.getByRole('button', { name: /Today training tab/i }),
        page.getByText('Today', { exact: true }),
      ],
      'Today training tab',
    );
    await expectVisibleAny(
      [
        page.getByRole('button', { name: /Week training tab/i }),
        page.getByRole('button', { name: /Plan training tab/i }),
        page.getByText(/Week|Plan/),
      ],
      'Plan or Week training tab',
    );
    await expectVisibleAny(
      [
        page.getByRole('button', { name: /Recent training tab/i }),
        page.getByRole('button', { name: /History training tab/i }),
        page.getByText(/Recent|History/),
      ],
      'History or Recent training tab',
    );
    await expectVisibleAny(
      [
        page.getByRole('button', { name: /Progress training tab/i }),
        page.getByRole('button', { name: /Analytics training tab/i }),
        page.getByText(/Progress|Analytics/),
      ],
      'Analytics or Progress training tab',
    );

    await expectVisibleAny(
      [
        page.getByText(/Today's support work/i),
        page.getByText(/Set up your plan/i),
        page.getByText(/How hard to go/i),
        page.getByRole('button', { name: /Start session|Set up plan|Open training/i }),
      ],
      'Train Today primary surface',
    );

    if (await isVisible(page.getByText(/Today's support work/i), 750)) {
      await expect(page.getByRole('button', { name: /Open support session/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Build support session/i })).toHaveCount(0);
      await page.getByRole('button', { name: /Open support session/i }).click();
      await expectVisibleAny(
        [
          page.getByText(/Session brief/i),
          page.getByText(/Build today's session/i),
          page.getByText(/Protected boxing anchor/i),
        ],
        'WorkoutDetail after opening Today support session',
      );
    }

    await expectNoDeveloperCopy(page);
    if (isSmallViewport(page)) {
      await expectNoImpossibleHorizontalOverflow(page);
    }
  });

  test('Week, History, and Analytics subtabs keep athlete-facing copy clean', async ({ page }) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; Train smoke requires a ready user.`);

    await openTab(page, 'Train');

    await openTrainingTab(page, 'Week');
    await expectVisibleAny(
      [
        page.getByText(/Set up your plan/i),
        page.getByRole('button', { name: /Adjust plan/i }),
        page.getByRole('button', { name: /minutes/i }),
      ],
      'Train Week tab content',
    );
    await expectNoDeveloperCopy(page);

    const firstPlanEntry = page.getByRole('button', { name: /minutes/i }).first();
    if (await isVisible(firstPlanEntry, 750)) {
      await firstPlanEntry.click();
      await expectVisibleAny(
        [
          page.getByText(/Session brief/i),
          page.getByText(/Loading session/i),
          page.getByText(/No session found/i),
        ],
        'Workout entry destination',
      );
      await expect(page.getByText(/GuidedWorkout/i)).toHaveCount(0);
      await expectNoDeveloperCopy(page);
      await page.goBack();
    }

    await openTab(page, 'Train');
    await openTrainingTab(page, 'Recent');
    await expectVisibleAny(
      [
        page.getByText(/recent sessions will show up here/i),
        page.getByText(/Support session/i),
        page.getByText(/Logged workout/i),
      ],
      'Train History tab content',
    );
    expect(await getVisiblePageText(page)).not.toMatch(/\bgenerated session\b/i);
    await expectNoDeveloperCopy(page);

    await openTrainingTab(page, 'Progress');
    await expectVisibleAny(
      [
        page.getByText(/Progress will get clearer/i),
        page.getByText(/Consistency/i),
        page.getByRole('button', { name: /More metrics/i }),
      ],
      'Train Analytics tab content',
    );
    const moreMetrics = page.getByRole('button', { name: /More metrics/i });
    if (await isVisible(moreMetrics, 750)) {
      await moreMetrics.click();
      await expect(page.getByRole('button', { name: /Hide deeper metrics/i })).toBeVisible();
    }
    await expectNoDeveloperCopy(page);
  });
});
