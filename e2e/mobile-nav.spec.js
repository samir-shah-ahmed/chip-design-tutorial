import { test, expect } from '@playwright/test';

const NARROW = { width: 600, height: 900 };
const WIDE = { width: 1280, height: 800 };

test.describe('sidebar navigation', () => {
  test('sidebar starts collapsed in narrow mode', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto('/');
    await expect(page.getByTestId('course-nav')).toHaveAttribute('data-open', 'false');
  });

  test('sidebar trigger opens the panel in narrow mode', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto('/lesson/verilog/intro');
    await expect(page.getByTestId('course-nav')).toHaveAttribute('data-open', 'false');
    await page.getByRole('button', { name: /toggle sidebar/i }).click();
    const nav = page.getByTestId('course-nav');
    await expect(nav).toHaveAttribute('data-open', 'true');
    await expect(nav.getByRole('link', { name: 'What is Verilog?' })).toBeVisible();
  });

  test('clicking a lesson inside the panel navigates', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto('/lesson/verilog/intro');
    await page.getByRole('button', { name: /toggle sidebar/i }).click();
    const nav = page.getByTestId('course-nav');
    await nav.getByRole('link', { name: 'Logic Gates in Verilog' }).click();
    await expect(page.getByTestId('lesson-title')).toHaveText('Logic Gates in Verilog');
  });

  test('desktop sidebar has nav buttons visible', async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto('/');
    const nav = page.getByTestId('course-nav');
    await expect(nav).toHaveAttribute('data-open', 'true');
    await expect(nav.getByRole('button', { name: 'Boolean and Gates' })).toBeVisible();
  });

  test('desktop sidebar toggle collapses and restores the panel', async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto('/');
    const nav = page.getByTestId('course-nav');
    await expect(nav).toHaveAttribute('data-open', 'true');
    await page.getByRole('button', { name: /toggle sidebar/i }).click();
    await expect(nav).toHaveAttribute('data-open', 'false');
    await page.getByRole('button', { name: /toggle sidebar/i }).click();
    await expect(nav).toHaveAttribute('data-open', 'true');
  });
});
