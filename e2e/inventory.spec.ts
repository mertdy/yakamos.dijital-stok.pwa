import { test, expect } from '@playwright/test';
import { ENV } from '../src/core/config/env';
import { ROUTES } from '../src/core/config/routes';

test.describe('Inventory Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto(ROUTES.LOGIN);
    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();
  });

  test('should perform full product CRUD cycle', async ({ page }) => {
    await page.goto(ROUTES.INVENTORY.INDEX);
    await expect(page.getByText('Envanter Yönetimi')).toBeVisible();

    // 1. Create Product
    await page.click('button:has-text("Yeni Ürün")');
    await expect(
      page.getByRole('heading', { name: 'Yeni Ürün Ekle' })
    ).toBeVisible();

    const uniqueName = `E2E Product ${Date.now()}`;
    await page.locator('input[name="name"]').fill(uniqueName);
    await page.locator('input[name="stock"]').fill('100');
    await page.locator('input[name="price"]').fill('25.50');

    await page.click('button:has-text("Ürünü Kaydet")');

    // 2. Search and verify
    await page
      .locator('input[placeholder="Ürün adı veya barkod ile ara..."]')
      .fill(uniqueName);
    await expect(page.getByText(uniqueName)).toBeVisible();

    // 3. Edit Product
    await page.getByRole('button', { name: 'Düzenle' }).click();
    await expect(
      page.getByRole('heading', { name: 'Ürün Düzenle' })
    ).toBeVisible();
    await page.locator('input[name="price"]').fill('30.00');
    await page.click('button:has-text("Değişiklikleri Kaydet")');

    // 4. Verify update
    await page
      .locator('input[placeholder="Ürün adı veya barkod ile ara..."]')
      .fill(uniqueName);
    await expect(page.getByText('₺30.00')).toBeVisible();

    // 5. Delete Product
    await page.getByRole('button', { name: 'Sil' }).click();
    // Wait for custom HeroUI confirm modal
    await expect(
      page.getByText('Bu ürünü silmek istediğinize emin misiniz?')
    ).toBeVisible();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sil' })
      .click();

    // Verify it is deleted from the table
    await page
      .locator('input[placeholder="Ürün adı veya barkod ile ara..."]')
      .fill(uniqueName);
    await expect(page.getByText(uniqueName)).not.toBeVisible();
  });
});
