import { test, expect } from '@playwright/test';
import { login, uniqueName } from './support/app';

test.describe('Data management workflows @online', () => {
  test('imports an inventory CSV with suggested column mappings and exports the selected data', async ({
    page
  }) => {
    const importedName = uniqueName('İçe-Aktarım');
    const barcode = `869${Date.now().toString().slice(-10)}`;
    await login(page);
    await page.goto('/company-settings');
    await expect(
      page.getByRole('heading', { name: 'Şirket Ayarları' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Dosyadan İçe Aktar' }).click();
    const importDialog = page.getByRole('dialog');
    await expect(
      importDialog.getByRole('heading', { name: 'Verileri İçe Aktar' })
    ).toBeVisible();
    await importDialog.locator('input[type="file"]').setInputFiles({
      name: 'envanter.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `Ürün Adı,Barkod No,Stok,"Fiyat (KDV Hariç, TL)"\n${importedName},${barcode},7,19.5\n`
      )
    });
    await expect(importDialog.getByText('1 satır bulundu.')).toBeVisible();
    await importDialog.getByRole('button', { name: 'Devam Et' }).click();
    await expect(importDialog.getByText('İçe aktarma özeti')).toBeVisible();
    await importDialog
      .getByRole('button', { name: 'İçe Aktarmayı Onayla' })
      .click();
    await expect(
      importDialog.getByText('İçe aktarma tamamlandı')
    ).toBeVisible();
    await importDialog.getByRole('button', { name: 'Kapat' }).click();

    await page.getByRole('link', { name: 'Envanter' }).click();
    const search = page.locator(
      'input[placeholder="Ürün adı veya barkod ile ara..."]'
    );
    await search.fill(importedName);
    await expect(page.getByText(importedName)).toBeVisible();

    await page.getByRole('link', { name: 'Şirket Ayarları' }).click();
    await page
      .getByRole('button', { name: 'Dışa Aktarma Seçenekleri' })
      .click();
    const exportDialog = page.getByRole('dialog');
    await expect(
      exportDialog.getByRole('heading', { name: 'Verileri Dışa Aktar' })
    ).toBeVisible();
    await exportDialog.getByRole('button', { name: 'Seçimi temizle' }).click();
    await exportDialog.getByText('Envanter').first().click();
    await exportDialog.getByRole('button', { name: 'Devam Et' }).click();
    await exportDialog.getByRole('button', { name: 'CSV' }).click();
    await exportDialog.getByRole('button', { name: 'Devam Et' }).click();
    const downloadPromise = page.waitForEvent('download');
    await exportDialog.getByRole('button', { name: 'Dışa Aktar' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
