import { test, expect } from '@playwright/test';
import { ENV } from '../src/core/config/env';
import { ROUTES } from '../src/core/config/routes';

test.describe('Authentication Flow', () => {
  test('should successfully log in and redirect to dashboard', async ({
    page
  }) => {
    await page.goto(ROUTES.LOGIN);
    await expect(
      page.getByRole('heading', { name: 'Dijital Stok' })
    ).toBeVisible();

    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.click('#login-submit-btn');

    // Should redirect to dashboard and show Anasayfa title
    await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({
    page
  }) => {
    await page.goto(ROUTES.LOGIN);
    await page.locator('#login-email').fill('wrong@dijitalstok.com');
    await page.locator('#login-password').fill('wrongpass');
    await page.click('#login-submit-btn');

    // Verify Turkish error message is displayed
    await expect(
      page.getByRole('tabpanel', { name: 'Giriş Yap' }).getByRole('alert')
    ).toContainText('E-posta veya şifre hatalı.');
  });
});
