import { test, expect } from '@playwright/test';
import { ENV } from '../src/core/config/env';
import { ROUTES } from '../src/core/config/routes';
import { dismissOnboardingIfVisible } from './support/app';

test.describe('Kritik Para Akışı (Money Flow)', () => {
  test('Kullanıcı giriş yapıp sepetine ürün ekleyerek satışı tamamlayabilmeli', async ({
    page
  }) => {
    // 1. Uygulamaya Git
    await page.goto('/');

    // 2. Giriş Yap
    await expect(
      page.getByRole('heading', { name: 'Dijital Stok' })
    ).toBeVisible();
    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();
    await dismissOnboardingIfVisible(page);

    // 3. Satış (POS) Ekranında Olduğumuzu Doğrula
    await page.goto(ROUTES.SALES);
    await expect(
      page.getByRole('heading', { name: 'Sipariş Detayları' })
    ).toBeVisible();

    // 4. Sepete Ürün Ekle (Ürün adı aratarak ekle)
    // Create a product first in inventory if needed, but since we run this as part of E2E suite,
    // we can search for a product we know exists or create one.
    // Let's go to inventory and add one product first to make sure it exists
    await page.goto(ROUTES.INVENTORY.INDEX);
    await page.click('button:has-text("Yeni Ürün")');
    const productName = `Flow Item ${Date.now()}`;
    await page.locator('input[name="name"]').fill(productName);
    await page.locator('input[name="stock"]').fill('10');
    await page.locator('input[name="salePrice"]').fill('15.00');
    await page.click('button:has-text("Ürünü Kaydet")');
    await expect(page.getByText('Yeni ürün eklendi')).toBeVisible();

    // Go back to POS
    await page.goto(ROUTES.SALES);
    const searchInput = page.locator(
      'input[placeholder="Ürün veya barkod ara..."]'
    );
    await searchInput.click();
    await searchInput.pressSequentially(productName);
    await page.click(`button:has-text("${productName}")`);

    // 5. Sepette Ürünün Göründüğünü Doğrula
    await expect(page.getByText('Toplam Tutar')).toBeVisible();

    // 6. Ödemeyi Al Butonuna Tıkla
    await page.click('button:has-text("Ödemeyi Al")');

    // 7. Satış Başarılı Bildirimini Doğrula
    await expect(
      page.locator('text="Satış başarıyla tamamlandı!"')
    ).toBeVisible();
  });
});
