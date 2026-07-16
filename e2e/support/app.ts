import { expect, type BrowserContext, type Page } from '@playwright/test';
import { ENV } from '../../src/core/config/env';

export const runId = `E2E-${Date.now()}`;

export const uniqueName = (kind: string) => `${runId}-${kind}-${Date.now()}`;

export async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(ENV.TEST_USER_EMAIL);
  await page.locator('#login-password').fill(ENV.TEST_USER_PASSWORD);
  await page.locator('#login-submit-btn').click();
  await expect(page.getByRole('heading', { name: 'Anasayfa' })).toBeVisible();
}

export async function createProduct(
  page: Page,
  product: { name: string; stock?: number; price?: number; barcode?: string }
) {
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Yeni Ürün' }).click();
  await expect(
    page.getByRole('heading', { name: 'Yeni Ürün Ekle' })
  ).toBeVisible();
  await page.locator('input[name="name"]').fill(product.name);
  await page.locator('input[name="stock"]').fill(String(product.stock ?? 20));
  await page.locator('input[name="price"]').fill(String(product.price ?? 10));
  if (product.barcode) {
    await page.locator('input[name="barcode"]').fill(product.barcode);
  }
  await page.getByRole('button', { name: 'Ürünü Kaydet' }).click();
  await expect(page.getByText('Yeni ürün eklendi')).toBeVisible();
}

export async function createCustomer(
  page: Page,
  customer: {
    name: string;
    surname?: string;
    creditLimit?: number;
    phone?: string;
  }
) {
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click();
  await expect(
    page.getByRole('heading', { name: 'Yeni Müşteri Ekle' })
  ).toBeVisible();
  await page.locator('input[name="name"]').fill(customer.name);
  if (customer.surname) {
    await page.locator('input[name="surname"]').fill(customer.surname);
  }
  if (customer.creditLimit !== undefined) {
    await page
      .locator('input[name="creditLimit"]')
      .fill(String(customer.creditLimit));
  }
  if (customer.phone) {
    await page.locator('input[name="phone"]').fill(customer.phone);
  }
  await page.getByRole('button', { name: 'Müşteriyi Kaydet' }).click();
  await expect(page.getByText('Müşteri başarıyla eklendi')).toBeVisible();
}

export async function addProductToCart(page: Page, name: string) {
  await page.goto('/sales');
  const search = page.locator('input[placeholder="Ürün veya barkod ara..."]');
  await search.fill(name);
  await page.getByRole('button', { name }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

export async function deleteProduct(page: Page, name: string) {
  await page.goto('/inventory');
  await page
    .locator('input[placeholder="Ürün adı veya barkod ile ara..."]')
    .fill(name);
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Sil' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Sil' })
    .click();
  await expect(row).toHaveCount(0);
}

export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });

  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller)
    );
  }
}

export async function setOffline(context: BrowserContext, page: Page) {
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await expect(
    page.getByLabel('Veriler çevrimdışı kaydediliyor').first()
  ).toBeVisible();
}

export async function setOnline(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
  await expect(page.getByLabel('Bulut ile senkronize').first()).toBeVisible();
}
