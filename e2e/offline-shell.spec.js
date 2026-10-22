import { test, expect } from '@playwright/test';

test('service worker serves a lesson with the network disabled', async ({ page, context }) => {
  test.setTimeout(120_000);

  await page.goto('/lesson/verilog/logic-basics');
  await expect(page.getByTestId('lesson-title')).toHaveText('Logic Gates in Verilog');

  await page.waitForFunction(() => navigator.serviceWorker?.ready, null, { timeout: 30_000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30_000 });

  await context.setOffline(true);
  await page.goto('/lesson/verilog/blocking');
  await expect(page.getByTestId('lesson-title')).toHaveText('Blocking and Non-Blocking', { timeout: 20_000 });
  await expect(page.locator('.lesson-body')).toContainText('non-blocking');
});
