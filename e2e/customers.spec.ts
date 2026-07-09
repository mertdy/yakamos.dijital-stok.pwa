import { test, expect } from '@playwright/test';
import { ENV } from '../src/core/config/env';

test.describe('Customer Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.click('#login-submit-btn');
    await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();
  });

  test('should create customer, navigate to details, and record a payment', async ({
    page
  }) => {
    await page.goto('/customers');
    await expect(
      page.getByRole('heading', { name: 'Müşteriler' })
    ).toBeVisible();

    // 1. Create a customer
    await page.click('button:has-text("Yeni Müşteri")');
    await expect(
      page.getByRole('heading', { name: 'Yeni Müşteri Ekle' })
    ).toBeVisible();

    const name = `E2E Cust ${Date.now()}`;
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="surname"]').fill('Surname');
    await page.locator('input[name="creditLimit"]').fill('1000');
    await page.click('button:has-text("Müşteriyi Kaydet")');

    // 2. Search and open detail view
    await page
      .locator('input[placeholder="İsim, soyisim veya telefon ile ara..."]')
      .fill(name);
    // Click on the row with customer name to navigate to details
    await page.getByText(name).click();
    await expect(
      page.getByRole('heading', { name: `${name} Surname` })
    ).toBeVisible();

    // 3. Take payment (Tahsilat Al)
    await page.click('button:has-text("Tahsilat Al")');
    await expect(
      page.getByRole('heading', { name: 'Tahsilat Al' })
    ).toBeVisible();

    await page.locator('input[placeholder="0.00"]').fill('250.00');
    // Save payment
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Kaydet' })
      .click();

    // 4. Verify updated balance
    // Debt should become -250 since payment was taken (displayed as +₺250,00 or +₺250.00)
    await expect(page.getByText('₺250,00')).toBeVisible();
  });
});
