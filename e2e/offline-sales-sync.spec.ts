import { test, expect } from '@playwright/test';
import { ROUTES } from '../src/core/config/routes';
import {
  addProductToCart,
  createProduct,
  deleteProduct,
  login,
  setOffline,
  setOnline,
  uniqueName,
  waitForServiceWorker
} from './support/app';

test.describe('Offline sales and recovery @offline @offline-to-online', () => {
  test('completes and cancels an offline sale, then syncs both queued writes after reconnecting', async ({
    page,
    context
  }) => {
    const productName = uniqueName('Offline-Satış');
    await login(page);
    await createProduct(page, { name: productName, stock: 4, price: 30 });

    // Warm every lazy route needed after the connection is cut.
    await page.goto(ROUTES.SALES_HISTORY);
    await expect(
      page.getByRole('heading', { name: 'Satış Geçmişi' })
    ).toBeVisible();
    await addProductToCart(page, productName);
    await waitForServiceWorker(page);
    await setOffline(context, page);

    await page.getByRole('button', { name: 'Ödemeyi Al' }).click();
    await expect(page.getByText('Satış başarıyla tamamlandı!')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Ödemeyi Al' })
    ).toBeDisabled();

    await page.goto(ROUTES.SALES_HISTORY);
    const pendingBackup = page.getByLabel(
      'İşlem cihazınıza kaydedildi; internet bağlantısı geldiğinde buluta yedeklenecek.'
    );
    await expect(pendingBackup).toBeVisible();
    const saleRow = page
      .getByRole('row')
      .filter({ has: pendingBackup })
      .first();
    await saleRow.click();
    await page.getByRole('button', { name: 'Satışı İptal Et' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'İptal Et' })
      .click();
    await expect(page.getByText('İptal Edildi').first()).toBeVisible();
    await expect(pendingBackup).toBeVisible();

    await setOnline(context, page);
    await expect(pendingBackup).toHaveCount(0, { timeout: 30_000 });
    await deleteProduct(page, productName);
  });
});
