import { expect, test } from '@playwright/test';
import { ENV } from '../src/core/config/env';
import { ROUTES } from '../src/core/config/routes';
import { dismissOnboardingIfVisible } from './support/app';

test.describe('Mobile application layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTES.LOGIN);
    await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
    await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
    await page.locator('#login-submit-btn').click();
    await expect(
      page.getByRole('button', { name: 'Menüyü aç' }).first()
    ).toBeVisible();
    await dismissOnboardingIfVisible(page);
  });

  test('keeps primary destinations in the bottom bar and secondary actions in the menu', async ({
    page
  }) => {
    await expect(page.getByRole('link', { name: 'Satış' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Envanter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menüyü aç' })).toHaveCount(
      1
    );
    await expect(
      page.getByRole('button', { name: 'Kullanıcı menüsünü aç' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Menüyü aç' }).first().click();

    await expect(page.getByRole('heading', { name: 'Menü' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Satış Geçmişi' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Çıkış yap/i })
    ).toBeVisible();
  });

  test('uses the focused POS shell on the sales route', async ({ page }) => {
    await page.goto(ROUTES.SALES);

    await expect(
      page.getByRole('button', { name: 'Menüyü aç' }).first()
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="Ürün veya barkod ara..."]')
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Ödemeye geç/ })
    ).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Envanter' })).toHaveCount(0);
  });
});
