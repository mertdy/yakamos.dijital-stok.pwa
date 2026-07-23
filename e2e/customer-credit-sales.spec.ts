import { test, expect } from '@playwright/test';
import {
  addProductToCart,
  createCustomer,
  createProduct,
  login,
  uniqueName
} from './support/app';

test.describe('Customer credit sale and collection @online', () => {
  test('combines customer, credit sale, history, and collection workflows', async ({
    page
  }) => {
    const customerName = uniqueName('Veresiye-Müşteri');
    const productName = uniqueName('Veresiye-Ürün');
    await login(page);
    await createCustomer(page, {
      name: customerName,
      surname: 'E2E',
      creditLimit: 100
    });
    await createProduct(page, { name: productName, stock: 5, price: 20 });
    await addProductToCart(page, productName);

    await page.getByRole('button', { name: 'Müşteri', exact: true }).click();
    const customerDrawer = page.getByRole('heading', {
      name: 'Müşteri Seçimi'
    });
    await expect(customerDrawer).toBeVisible();
    await page
      .locator('input[placeholder="Müşteri ara..."]')
      .fill(customerName);
    await page.getByRole('button', { name: `${customerName} E2E` }).click();
    await page.getByRole('button', { name: 'Veresiye', exact: true }).click();
    await page.getByRole('button', { name: 'Ödemeyi Al' }).click();
    await expect(page.getByText('Satış başarıyla tamamlandı!')).toBeVisible();

    await page.getByRole('button', { name: 'Müşteriler' }).click();
    await page
      .locator('input[placeholder="İsim, soyisim veya telefon ile ara..."]')
      .fill(customerName);
    const customerRow = page.getByRole('row', {
      name: new RegExp(customerName)
    });
    await customerRow.getByLabel('Hesap Detayı').click();
    await expect(page.getByText('₺20,00')).toBeVisible();
    await page.getByRole('button', { name: 'Tahsilat Al' }).click();
    const paymentDialog = page.getByRole('dialog');
    await paymentDialog.locator('input[placeholder="0.00"]').fill('20');
    await paymentDialog.getByRole('button', { name: 'Kaydet' }).click();
    await expect(
      page.getByText('Mevcut Borç Bakiye').locator('xpath=../..')
    ).toContainText('₺0,00');
  });
});
