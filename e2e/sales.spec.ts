import { test, expect } from '@playwright/test';

test.describe('Sales Flow', () => {
  test('should navigate to sales page and display empty cart', async ({
    page
  }) => {
    await page.goto('/sales');
    await expect(page.getByText('Satış Noktası')).toBeVisible();
    await expect(page.getByText('Sepet', { exact: true })).toBeVisible();
    await expect(
      page.locator('button', { hasText: 'Ödemeyi Al' })
    ).toBeDisabled();
  });
});
