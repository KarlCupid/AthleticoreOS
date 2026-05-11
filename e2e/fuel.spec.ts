import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectNoImpossibleHorizontalOverflow,
  getVisiblePageText,
  isSmallViewport,
  isVisible,
} from './helpers/assertions';
import { openTab } from './helpers/app';
import { signInWithEnvUser, skipIfNoAuthCredentials } from './helpers/auth';

test.describe('Fuel smoke', () => {
  skipIfNoAuthCredentials(test);

  test('quick and tracker modes expose fuel focus, logging, and hydration', async ({ page }) => {
    const state = await signInWithEnvUser(page);
    test.skip(state !== 'main', `The configured E2E user landed in ${state}; Fuel smoke requires a ready user.`);

    await openTab(page, 'Fuel');
    await expect(page.getByText(/Today's fuel/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Quick log mode/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tracker mode/i })).toBeVisible();
    await expect(page.getByText(/Fuel focus/i).first()).toBeVisible();
    await expect(page.getByText(/Log next/i)).toBeVisible();
    await expect(page.getByText(/Water/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Show fuel details/i })).toBeVisible();

    const quickText = await getVisiblePageText(page);
    const fuelFocusIndex = quickText.indexOf('Fuel focus');
    const macroIndex = quickText.indexOf('Macro targets');
    if (fuelFocusIndex >= 0 && macroIndex >= 0) {
      expect(macroIndex).toBeGreaterThan(fuelFocusIndex);
    }

    await page.getByRole('button', { name: /Show fuel details/i }).click();
    await expect(page.getByRole('button', { name: /Hide fuel details/i })).toBeVisible();
    await expectNoDeveloperCopy(page);

    const trackerMode = page.getByRole('button', { name: /Tracker mode/i });
    await trackerMode.click();
    await expect(page.getByRole('button', { name: /Open quick log/i })).toBeVisible();
    await expect(
      page.getByText(/Breakfast|Lunch|Dinner|Snacks|Session fueling|Macro targets/i).first(),
    ).toBeVisible();

    if (await isVisible(page.getByRole('button', { name: /Show fuel details/i }), 750)) {
      await page.getByRole('button', { name: /Show fuel details/i }).click();
      await expect(page.getByRole('button', { name: /Hide fuel details/i })).toBeVisible();
    }

    await expectNoDeveloperCopy(page);
    if (isSmallViewport(page)) {
      await expectNoImpossibleHorizontalOverflow(page);
    }
  });
});
