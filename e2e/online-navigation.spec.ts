import { test, expect } from '@playwright/test';
import { login } from './support/app';
import { ROUTES } from '../src/core/config/routes';

test.describe('Online navigation and page availability @online', () => {
  test('navigates through every primary application page without losing the shell', async ({
    page
  }) => {
    await login(page);

    const pages = [
      [ROUTES.SALES, 'Sipariş Detayları'],
      [ROUTES.SALES_HISTORY, 'Satış Geçmişi'],
      [ROUTES.CUSTOMERS.INDEX, 'Müşteriler'],
      [ROUTES.INVENTORY.INDEX, 'Envanter Yönetimi'],
      [ROUTES.ACCOUNT_SETTINGS, 'Hesap Ayarları']
    ] as const;

    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(
        page.locator('[data-onboarding="main-navigation"]')
      ).toBeVisible();
    }
  });
});
