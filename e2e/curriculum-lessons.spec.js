import { test, expect } from '@playwright/test';

test('about page credits the upstream tutorial and states the missing license', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'VeriBench' })).toBeVisible();
  await page.getByRole('link', { name: 'About VeriBench' }).click();
  await expect(page.getByRole('heading', { name: 'License' })).toBeVisible();
  await expect(page.locator('.lesson-body')).toContainText('no LICENSE');
  await expect(page.locator('.lesson-body')).toContainText('thomasnormal/sv-tutorial');
});

const CASES = [
  ['/lesson/verilog/logic-basics', 'Logic Gates in Verilog', 'a ^ b ^ cin'],
  ['/lesson/verilog/fsm', 'A Sequence Detector', 'din ? S3'],
  ['/lesson/boards/nano9k-blink', 'Tang Nano 9K Blinky', 'led <= ~led'],
  ['/lesson/fpga/architecture', 'LUTs, Flip-Flops, and Hard Blocks', 'sel == 2'],
  ['/lesson/asic/open-tools', 'OpenLane and Tiny Tapeout', 'uo_out +'],
];

for (const [url, title, snippet] of CASES) {
  test(`${title} shows its solution in the editor`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByTestId('lesson-title')).toHaveText(title);
    await expect(page.locator('.lesson-body')).toContainText('Sources');

    await page.getByTestId('options-button').click();
    await page.getByTestId('solve-button').click();
    await expect(page.locator('.cm-content').filter({ hasText: snippet }).first()).toBeVisible();
  });
}
