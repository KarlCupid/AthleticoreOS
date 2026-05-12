import { expect, test } from '@playwright/test';
import {
  expectNoDeveloperCopy,
  expectNoImpossibleHorizontalOverflow,
  expectVisibleAny,
  isSmallViewport,
} from './helpers/assertions';
import { gotoApp } from './helpers/app';

test.describe('Auth smoke', () => {
  test('auth screen loads', async ({ page }) => {
    await gotoApp(page);

    await expect(page.getByText(/Athleticore(?: OS)?/i).first()).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Create account$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Forgot password/i })).toBeVisible();
    await expectNoDeveloperCopy(page);

    if (isSmallViewport(page)) {
      await expectNoImpossibleHorizontalOverflow(page);
    }
  });

  test('create account opens a dedicated signup form', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: /^Create account$/i }).click();
    await expect(page.getByText(/^Create account$/i).first()).toBeVisible();
    await expect(page.getByText(/Create your login/i)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Create password', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Confirm password', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Create account$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in instead/i })).toBeVisible();
    await expectNoDeveloperCopy(page);

    await page.getByRole('button', { name: /Sign in instead/i }).click();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Forgot password/i })).toBeVisible();
  });

  test('forgot password flow returns to sign in', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: /Forgot password/i }).click();
    await expect(page.getByText(/Reset password/i)).toBeVisible();
    await expect(page.getByText(/send a reset link/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Send password reset link/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to sign in/i })).toBeVisible();
    await expectNoDeveloperCopy(page);

    await page.getByRole('button', { name: /Back to sign in/i }).click();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
  });

  test('invalid sign-in uses calm copy', async ({ page }) => {
    await gotoApp(page);

    await page.getByLabel('Email').fill(`missing-user-${Date.now()}@example.com`);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expectVisibleAny(
      [
        page.getByText(/That email and password do not match/i),
        page.getByText(/We could not sign you in right now/i),
        page.getByText(/We could not reach Athleticore right now/i),
        page.getByText(/Too many attempts/i),
      ],
      'calm invalid sign-in error copy',
      20_000,
    );

    await expect(page.getByText(/Supabase|AuthApiError|invalid login credentials|JWT/i)).toHaveCount(0);
    await expectNoDeveloperCopy(page);
  });
});
