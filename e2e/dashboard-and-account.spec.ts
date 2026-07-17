import { test, expect } from '@playwright/test';
import { login } from './support/app';
import { ROUTES } from '../src/core/config/routes';

test.describe('Dashboard and account surfaces @online', () => {
  test('switches dashboard analytics and reaches account and pricing pages through navigation', async ({
    page
  }) => {
    await login(page);
    await expect(page.getByText('Bugünkü Ciro')).toBeVisible();
    await page.getByRole('tab', { name: 'Müşteri Analizi' }).click();
    await expect(page.getByText('En Çok Borcu Olanlar')).toBeVisible();
    await page.getByRole('tab', { name: /Stok Uyarıları/ }).click();
    await expect(
      page.getByText('Kritik Stok Seviyesindeki Ürünler')
    ).toBeVisible();

    await page.goto(ROUTES.ACCOUNT_SETTINGS);
    await expect(
      page.getByRole('heading', { name: 'Hesap Ayarları' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Kullanıcı menüsünü aç' }).click();
    await page
      .getByRole('menuitem', { name: 'Planlar ve Fiyatlandırma' })
      .click();
    await expect(
      page.getByText('Planlar ve Fiyatlandırma').first()
    ).toBeVisible();
  });
});
