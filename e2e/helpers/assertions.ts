import { expect, type Locator, type Page } from '@playwright/test';

export const FORBIDDEN_VISIBLE_TEXT = [
  'GeneratedWorkout',
  'snapshot',
  'payload',
  'validation',
  'legacy',
  'beta',
  'dev preview',
  'protocol',
  'compliance',
  'adherence',
  'classification',
  'intervention',
  'directive',
  'invalid',
  'failure',
  'AthletiCore',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function forbiddenPattern(term: string): RegExp {
  const escaped = escapeRegExp(term).replace(/\\ /g, '\\s+');
  if (term === 'AthletiCore') {
    return new RegExp(`\\b${escaped}\\b`);
  }
  if (/^[a-z0-9 ]+$/i.test(term)) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  return new RegExp(escaped, 'i');
}

export async function getVisiblePageText(page: Page): Promise<string> {
  return page.locator('body').evaluate((body) => (body as HTMLElement).innerText);
}

export async function isVisible(locator: Locator, timeout = 750): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

export async function expectVisibleAny(
  candidates: Locator[],
  description: string,
  timeout = 10_000,
): Promise<Locator> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const candidate of candidates) {
      if (await isVisible(candidate, 250)) {
        await expect(candidate.first(), description).toBeVisible();
        return candidate.first();
      }
    }
  }

  throw new Error(`Expected visible UI for: ${description}`);
}

export async function expectNoDeveloperCopy(page: Page): Promise<void> {
  const visibleText = await getVisiblePageText(page);
  const offenders = FORBIDDEN_VISIBLE_TEXT.filter((term) => forbiddenPattern(term).test(visibleText));
  expect(
    offenders,
    `Forbidden developer/internal copy appeared in visible UI: ${offenders.join(', ')}`,
  ).toEqual([]);
}

export async function expectPrimaryActionVisible(page: Page): Promise<void> {
  await expectVisibleAny(
    [
      page.getByRole('button', {
        name: /sign in|continue|build my first mission|open today's mission|start session|open support session|build today's session|update journey plan|evaluate weight class|log|show details|more metrics|try again/i,
      }),
      page.getByTestId('today-mission-primary-cta'),
      page.getByTestId('fuel-open-full-tracker'),
      page.getByTestId('weight-class-evaluate-class'),
    ],
    'a primary action or useful empty-state action',
  );
}

export async function expectNoImpossibleHorizontalOverflow(page: Page): Promise<void> {
  const offenders = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const text = (element.innerText || '').trim().replace(/\s+/g, ' ');
        const role = element.getAttribute('role') || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const isNativeControl = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(element.tagName);
        const isUserFacing = Boolean(text || role || ariaLabel || isNativeControl);
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.top <= viewportHeight;

        return {
          label: text || ariaLabel || role || element.tagName,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          isVisible,
          isUserFacing,
        };
      })
      .filter((item) => item.isVisible && item.isUserFacing)
      .filter((item) => item.left < -8 || item.right > viewportWidth + 8)
      .slice(0, 5);
  });

  expect(offenders, `Visible text/control elements overflow horizontally: ${JSON.stringify(offenders)}`).toEqual([]);
}

export function isSmallViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 9999) <= 430;
}
