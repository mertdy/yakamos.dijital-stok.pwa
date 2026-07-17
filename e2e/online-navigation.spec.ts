import { test, expect } from '@playwright/test';
import { login } from './support/app';

test.describe('Online navigation and page availability @online', () => {
  test('navigates through every primary application page without losing the shell', async ({
    page
  }) => {
    await login(page);

    const pages = [
      ['/sales', 'Sipariş Detayları'],
      ['/sales-history', 'Satış Geçmişi'],
      ['/customers', 'Müşteriler'],
      ['/inventory', 'Envanter Yönetimi'],
      ['/account-settings', 'Hesap Ayarları']
    ] as const;

    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });
});
