import { test, expect } from '@playwright/test';
import { ROUTES } from '../src/core/config/routes';
import {
  addProductToCart,
  createProduct,
  deleteProduct,
  login,
  uniqueName
} from './support/app';

const quickAddButton = (
  page: import('@playwright/test').Page,
  productName: string
) =>
  page.getByRole('button', {
    name: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ₺`)
  });

async function addQuickAddShortcut(
  page: import('@playwright/test').Page,
  productName: string
) {
  await page.goto(ROUTES.SALES);
  await page.getByRole('button', { name: 'Düzenle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .locator('input[placeholder="Envanterde ara..."]')
    .fill(productName);
  const productOption = dialog
    .getByText(productName)
    .first()
    .locator('xpath=../../..');
  await productOption.getByRole('button').click();
  await dialog.getByRole('button', { name: 'Değişiklikleri Kaydet' }).click();
  await expect(
    page.getByText('Kısayollar başarıyla kaydedildi.')
  ).toBeVisible();
}

async function createCompany(
  page: import('@playwright/test').Page,
  name: string
) {
  const expandSidebar = page.getByRole('button', {
    name: 'Kenar çubuğunu genişlet'
  });
  if (await expandSidebar.isVisible()) {
    await expandSidebar.click({ force: true });
  }

  await page.getByRole('button', { name: 'İşletme Seç' }).click();
  await page
    .getByText('Yeni İşletme Kur', { exact: true })
    .click({ force: true });
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="name"]').fill(name);
  await dialog.getByRole('button', { name: 'Kurulumu Tamamla' }).click();
  await expect(page.getByText('Yeni işletme başarıyla kuruldu!')).toBeVisible();

  if (await expandSidebar.isVisible()) {
    await expandSidebar.click({ force: true });
  }

  await expect(page.getByRole('button', { name: 'İşletme Seç' })).toContainText(
    name
  );
}

async function switchCompany(
  page: import('@playwright/test').Page,
  name: string
) {
  const expandSidebar = page.getByRole('button', {
    name: 'Kenar çubuğunu genişlet'
  });
  if (await expandSidebar.isVisible()) {
    await expandSidebar.click({ force: true });
  }

  await page.getByRole('button', { name: 'İşletme Seç' }).click();
  const option = page
    .locator('[role="menuitem"], [role="menuitemradio"]')
    .filter({ hasText: name })
    .first();
  await option.click();
  await expect(page.getByText('İşletme değiştirildi').first()).toBeVisible();

  if (await expandSidebar.isVisible()) {
    await expandSidebar.click({ force: true });
  }

  await expect(page.getByRole('button', { name: 'İşletme Seç' })).toContainText(
    name
  );
}

test.describe('Online sales composition @online', () => {
  test('configures a quick-add shortcut, combines it with search, and completes a discounted card sale', async ({
    page
  }) => {
    const productName = uniqueName('Hızlı-Satış');
    await login(page);
    await createProduct(page, { name: productName, stock: 8, price: 25 });

    await page.goto(ROUTES.SALES);
    await page.getByRole('button', { name: 'Düzenle' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Hızlı Ekle Kısayollarını Düzenle' })
    ).toBeVisible();
    await dialog
      .locator('input[placeholder="Envanterde ara..."]')
      .fill(productName);
    const productOption = dialog
      .getByText(productName)
      .first()
      .locator('xpath=../../..');
    await productOption.getByRole('button').click();
    await dialog.getByRole('button', { name: 'Değişiklikleri Kaydet' }).click();
    await expect(
      page.getByText('Kısayollar başarıyla kaydedildi.')
    ).toBeVisible();

    await quickAddButton(page, productName).click();
    await addProductToCart(page, productName);
    await page.getByRole('button', { name: '% Yüzde' }).click();
    await page.locator('input[placeholder="İndirim Miktarı"]').fill('10');
    await page.getByRole('button', { name: 'Kart' }).click();
    await page.getByRole('button', { name: 'Ödemeyi Al' }).click();
    await expect(page.getByText('Satış başarıyla tamamlandı!')).toBeVisible();

    await deleteProduct(page, productName);
  });
});

test.describe('Company-specific quick-add shortcuts @online', () => {
  test('shows the selected company instead of a persistent loading label after the first switch', async ({
    page
  }) => {
    const secondCompanyName = uniqueName('İlk-Geçiş-İşletmesi');

    await login(page);
    const firstCompanyName = (
      await page.getByRole('button', { name: 'İşletme Seç' }).innerText()
    ).trim();

    await createCompany(page, secondCompanyName);

    await page.evaluate(() => {
      const companySwitcher = document.querySelector(
        '[aria-label="İşletme Seç"]'
      );
      let wasLoading = false;
      let loadingPeriods = 0;

      const inspect = () => {
        const isLoading =
          companySwitcher?.textContent?.includes('Yükleniyor...');
        if (isLoading && !wasLoading) loadingPeriods += 1;
        wasLoading = Boolean(isLoading);
        window.sessionStorage.setItem(
          'e2e-company-switch-loading-periods',
          String(loadingPeriods)
        );
      };

      new MutationObserver(inspect).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      window.setInterval(inspect, 25);
      inspect();
    });
    await switchCompany(page, firstCompanyName);

    const companySwitcher = page.getByRole('button', {
      name: 'İşletme Seç'
    });
    await expect(companySwitcher).toContainText(firstCompanyName);
    await page.waitForTimeout(500);
    await expect(companySwitcher).not.toContainText('Yükleniyor...');
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(
            window.sessionStorage.getItem('e2e-company-switch-loading-periods')
          )
        )
      )
      .toBeLessThanOrEqual(2);
  });

  test('never shows the previous company shortcuts after switching companies', async ({
    page
  }) => {
    const firstCompanyProduct = uniqueName('İlk-İşletme-Hızlı-Ekle');
    const secondCompanyName = uniqueName('İkinci-İşletme');
    const secondCompanyProduct = uniqueName('İkinci-İşletme-Hızlı-Ekle');

    await login(page);
    const firstCompanyName = (
      await page.getByRole('button', { name: 'İşletme Seç' }).innerText()
    ).trim();

    await createProduct(page, {
      name: firstCompanyProduct,
      stock: 3,
      price: 10
    });
    await addQuickAddShortcut(page, firstCompanyProduct);
    await expect(quickAddButton(page, firstCompanyProduct)).toBeVisible();

    await createCompany(page, secondCompanyName);
    await createProduct(page, {
      name: secondCompanyProduct,
      stock: 3,
      price: 20
    });
    await addQuickAddShortcut(page, secondCompanyProduct);
    await expect(quickAddButton(page, secondCompanyProduct)).toBeVisible();
    await switchCompany(page, firstCompanyName);
    await expect(quickAddButton(page, firstCompanyProduct)).toBeVisible();

    // Start observing just before the switch. Once the new company is active,
    // the previous company's shortcut must not be inserted even for one frame.
    await page.evaluate(
      ({ companyName, previousProductName }) => {
        let isNewCompanyActive = false;
        let previousShortcutWasShown = false;
        const companySwitcher = document.querySelector(
          '[aria-label="İşletme Seç"]'
        );

        window.sessionStorage.setItem(
          'e2e-previous-quick-add-was-shown',
          'false'
        );

        const inspect = () => {
          isNewCompanyActive ||=
            companySwitcher?.textContent?.includes(companyName);
          if (!isNewCompanyActive) return;

          previousShortcutWasShown ||= Array.from(
            document.querySelectorAll('button')
          ).some(button => button.textContent?.includes(previousProductName));
          if (previousShortcutWasShown) {
            window.sessionStorage.setItem(
              'e2e-previous-quick-add-was-shown',
              'true'
            );
          }
        };

        const observer = new MutationObserver(inspect);
        observer.observe(document.body, { childList: true, subtree: true });
        window.setInterval(inspect, 25);
        inspect();
      },
      {
        companyName: secondCompanyName,
        previousProductName: firstCompanyProduct
      }
    );

    await switchCompany(page, secondCompanyName);
    await expect(quickAddButton(page, secondCompanyProduct)).toBeVisible();
    await page.waitForTimeout(700);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.sessionStorage.getItem('e2e-previous-quick-add-was-shown')
        )
      )
      .toBe('false');

    await switchCompany(page, firstCompanyName);
    await deleteProduct(page, firstCompanyProduct);
    await switchCompany(page, secondCompanyName);
    await deleteProduct(page, secondCompanyProduct);
    await switchCompany(page, firstCompanyName);
  });
});
