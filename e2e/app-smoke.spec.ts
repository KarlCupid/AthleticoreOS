import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectPrimaryActionVisible,
  expectVisibleAny,
} from './helpers/assertions';
import {
  dismissFirstRunSurfaces,
  expectCoreScreenHealthy,
  openTab,
  openWeightClass,
} from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Authenticated app smoke', () => {
  skipIfNoAuthCredentials(test);

  test('major app surfaces expose headings and useful first actions', async ({ page }, testInfo) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; main app smoke requires a ready user.`);

    await dismissFirstRunSurfaces(page);

    await expectVisibleAny(
      [
        page.getByText(/Today's Mission/i),
        page.getByText(/TODAY'S READINESS/i),
        page.getByTestId('dashboard-quick-action-check-in'),
      ],
      'Today dashboard heading or quick action',
    );
    await expectPrimaryActionVisible(page);
    await expectNoDeveloperCopy(page);
    await expectCoreScreenHealthy(page);

    await openTab(page, 'Train');
    await expect(page.getByText('Training').first()).toBeVisible();
    await expectPrimaryActionVisible(page);
    await expectNoDeveloperCopy(page);
    await expectCoreScreenHealthy(page);

    await openTab(page, 'Fuel');
    await expect(page.getByText(/Today's fuel/i)).toBeVisible();
    await expectPrimaryActionVisible(page);
    await expectNoDeveloperCopy(page);
    await expectCoreScreenHealthy(page);

    await openTab(page, 'Me');
    await expectVisibleAny(
      [
        page.getByText(/Profile|Account|Settings|Athlete/i),
        page.getByRole('button', { name: /Sign out|Delete account|Privacy/i }),
      ],
      'Profile or account surface',
    );
    await expectNoDeveloperCopy(page);
    await expectCoreScreenHealthy(page);

    if (await openWeightClass(page)) {
      await expectVisibleAny(
        [
          page.getByText(/Weight-class context/i),
          page.getByText(/Body-mass context/i),
          page.getByText(/Safety review/i),
        ],
        'Weight-class context screen',
      );
      await expectNoDeveloperCopy(page);
      await expectCoreScreenHealthy(page);
    } else {
      testInfo.annotations.push({
        type: 'skip-note',
        description: 'Weight-class context was not reachable for this E2E account.',
      });
    }
  });
});
