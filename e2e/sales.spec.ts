import { test, expect } from '@playwright/test';
import { ENV } from '../src/core/config/env';

test.describe('Sales (POS) Flow', () => {
  const productName = `Sales Item ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();

    // 2. Ensure we have at least one test product in the inventory
    await page.goto('/inventory');
    await page.click('button:has-text("Yeni Ürün Ekle")');
    await page.locator('input[name="name"]').fill(productName);
    await page.locator('input[name="stock"]').fill('50');
    await page.locator('input[name="price"]').fill('20.00');
    await page.click('button:has-text("Ürünü Kaydet")');
  });

  test('should add product to cart, apply discount, and complete checkout', async ({
    page
  }) => {
    await page.goto('/sales');
    await expect(
      page.getByRole('heading', { name: 'Sipariş Detayları' })
    ).toBeVisible();

    // Search and select product
    const searchInput = page.locator(
      'input[placeholder="Ürün veya barkod ara..."]'
    );
    await searchInput.click();
    await searchInput.pressSequentially(productName);
    // Click on result in dropdown
    await page.click(`button:has-text("${productName}")`);

    // Verify product added to cart in the cart panel list
    await expect(
      page.locator(`span:has-text("${productName}")`).first()
    ).toBeVisible();

    // Apply discount
    await page.locator('input[placeholder="İndirim Miktarı"]').fill('5.00');

    // Complete Checkout
    await page.click('button:has-text("Ödemeyi Al")');

    // Verify success message
    await expect(page.getByText('Satış başarıyla tamamlandı!')).toBeVisible();
  });

  test('should hold and restore a sale', async ({ page }) => {
    await page.goto('/sales');

    // Search and add product
    const searchInput = page.locator(
      'input[placeholder="Ürün veya barkod ara..."]'
    );
    await searchInput.click();
    await searchInput.pressSequentially(productName);
    await page.click(`button:has-text("${productName}")`);

    // Click Beklet
    await page.click('button:has-text("Beklet")');
    await expect(page.getByText('Satış beklemeye alındı')).toBeVisible();

    // Verify checkout button is disabled because cart is empty
    await expect(
      page.locator('button', { hasText: 'Ödemeyi Al' })
    ).toBeDisabled();

    // Open hold list drawer
    await page.click('button:has-text("Bekleme Listesini Aç")');
    await expect(
      page.getByRole('heading', { name: 'Bekleyen Satışlar' })
    ).toBeVisible();

    // Click Sepete Aktar on our held item to restore it
    await page.click('span:has-text("Sepete Aktar")');
    await expect(page.getByText('Bekleyen satış yüklendi')).toBeVisible();

    // Verify item is back in cart
    await expect(
      page.locator(`span:has-text("${productName}")`).first()
    ).toBeVisible();
  });
});
