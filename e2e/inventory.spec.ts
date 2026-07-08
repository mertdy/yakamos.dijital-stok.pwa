import { test, expect } from '@playwright/test';

test.describe('Inventory Flow', () => {
  test('should add a new product and display it in table', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByText('Envanter Yönetimi')).toBeVisible();
    
    await page.click('button:has-text("Yeni Ürün Ekle")');
    await expect(page.getByRole('heading', { name: 'Yeni Ürün Ekle' })).toBeVisible();
    
    // Trigger validation
    await page.click('button:has-text("Kaydet")');
    await expect(page.getByText('Ürün adı en az 2 karakter olmalıdır')).toBeVisible();
    
    // Fill the form
    await page.locator('input[name="name"]').fill('Test E2E Ürünü');
    await page.locator('input[name="stock"]').fill('100');
    await page.locator('input[name="price"]').fill('25.50');
    
    await page.click('button:has-text("Kaydet")');
    
    // Verify it appeared in the table
    await expect(page.getByText('Test E2E Ürünü')).toBeVisible();
  });
});
