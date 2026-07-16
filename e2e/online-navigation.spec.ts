import { test, expect } from '@playwright/test';
import { login } from './support/app';

test.describe('Online navigation and page availability @online', () => {
  test('navigates through every primary application page without losing the shell', async ({
    page
  }) => {
    await login(page);

    const pages = [
      ['Satış', 'Sipariş Detayları'],
      ['Satış Geçmişi', 'Satış Geçmişi'],
      ['Müşteriler', 'Müşteriler'],
      ['Envanter', 'Envanter Yönetimi'],
      ['Hesap Ayarları', 'Hesap Ayarları']
    ] as const;

    for (const [navigationLabel, heading] of pages) {
      await page.getByRole('button', { name: navigationLabel }).first().click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });
});
