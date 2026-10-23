import { test, expect } from '@playwright/test';

test('prev/next navigate between verilog lessons', async ({ page }) => {
  await page.goto('/lesson/verilog/logic-basics');
  const title = page.getByTestId('lesson-title');
  await expect(title).toHaveText('Logic Gates in Verilog');
  await page.getByRole('button', { name: 'next' }).click();
  await expect(title).toHaveText('Gate-Level Modeling');
  await page.getByRole('button', { name: 'prev' }).click();
  await expect(title).toHaveText('Logic Gates in Verilog');
});

test('solve/reset toggles between solution and starter', async ({ page }) => {
  await page.goto('/lesson/verilog/logic-basics');
  await page.getByTestId('options-button').click();
  const solveBtn = page.getByTestId('solve-button');
  await expect(solveBtn).toHaveText('Show solution');
  await solveBtn.click();
  await expect(solveBtn).toHaveText('Reset to starter');
  await solveBtn.click();
  await expect(solveBtn).toHaveText('Show solution');
});
