import { test, expect, type Page } from '@playwright/test';
import { ENV } from '../src/core/config/env';
import { login, loginWithCredentials, uniqueName } from './support/app';

async function switchCompany(page: Page, companyName: string) {
  const expandSidebar = page.getByRole('button', {
    name: 'Kenar çubuğunu genişlet'
  });
  if (await expandSidebar.isVisible()) {
    await expandSidebar.click({ force: true });
  }
  await page
    .getByRole('button', { name: 'İşletme Seç' })
    .click({ force: true });
  const companyOption = page.getByRole('menuitem', {
    name: companyName,
    exact: true
  });
  await expect(companyOption).toHaveCount(1, { timeout: 10_000 });
  await companyOption.click();
  await expect(page.getByText('İşletme değiştirildi')).toBeVisible();
  await expect(page.getByRole('button', { name: 'İşletme Seç' })).toContainText(
    companyName
  );
}

test.describe('Company switch sales history @online', () => {
  test('shows the host company sales immediately and after refresh', async ({
    browser,
    page
  }) => {
    test.setTimeout(90_000);
    test.skip(
      !ENV.TEST_USER_2_EMAIL || !ENV.TEST_USER_2_PASSWORD,
      'VITE_TEST_USER_2_EMAIL and VITE_TEST_USER_2_PASSWORD are required.'
    );

    await login(page);
    const hostCompanyName = (
      await page.getByRole('button', { name: 'İşletme Seç' }).innerText()
    ).trim();
    await page.goto('/sales-history');
    const invoiceCells = page.locator('tbody tr td:nth-child(2)');
    await expect(invoiceCells).not.toHaveCount(0);
    const hostInvoiceNumber = (await invoiceCells.nth(0).innerText()).trim();

    // Seed the cross-company relationship for this test run. It grants the
    // permission needed to view all of the host company's sales.
    await page.goto('/company-settings');
    await page.getByRole('button', { name: 'Personel Davet Et' }).click();
    const inviteDialog = page.getByRole('dialog');
    await inviteDialog
      .locator('input[name="email"]')
      .fill(ENV.TEST_USER_2_EMAIL);
    await inviteDialog
      .locator('input[name="employeeName"]')
      .fill('E2E Satış Geçmişi');
    await inviteDialog.getByText('Satış Geçmişi', { exact: true }).click();
    await inviteDialog.getByRole('button', { name: 'Davet Gönder' }).click();
    await expect(
      page.getByText('davet gönderildi', { exact: false })
    ).toBeVisible();

    const employeeContext = await browser.newContext();
    const employeePage = await employeeContext.newPage();
    await loginWithCredentials(
      employeePage,
      ENV.TEST_USER_2_EMAIL,
      ENV.TEST_USER_2_PASSWORD
    );
    await employeePage.goto('/account-settings');
    const invitationCard = employeePage
      .getByText(hostCompanyName, { exact: true })
      .locator('xpath=../..');
    await invitationCard.getByRole('button', { name: 'Kabul Et' }).click();
    await expect(employeePage.getByText('Davet kabul edildi')).toBeVisible();

    const expandSidebar = employeePage.getByRole('button', {
      name: 'Kenar çubuğunu genişlet'
    });
    if (await expandSidebar.isVisible()) {
      await expandSidebar.click({ force: true });
    }

    // Accepting the invitation activates the host company. Switch back to the
    // employee's own company first, then exercise the target switch while the
    // sales-history route is open.
    await employeePage
      .getByRole('button', { name: 'İşletme Seç' })
      .click({ force: true });
    const companyItems = employeePage
      .getByRole('menuitem')
      .filter({ hasNotText: 'Yeni İşletme Kur' });
    const companyLabels = await companyItems.allTextContents();
    let ownCompanyName = companyLabels
      .map(label => label.trim())
      .find(label => label && label !== hostCompanyName);
    if (!ownCompanyName) {
      ownCompanyName = uniqueName('İkinci-Kullanıcı-İşletmesi');
      await employeePage
        .getByRole('menuitem', { name: 'Yeni İşletme Kur' })
        .click();
      const newCompanyDialog = employeePage.getByRole('dialog');
      await newCompanyDialog.locator('input[name="name"]').fill(ownCompanyName);
      await newCompanyDialog
        .getByRole('button', { name: 'Kurulumu Tamamla' })
        .click();
      await expect(
        employeePage.getByText('Yeni işletme başarıyla kuruldu!')
      ).toBeVisible();
    } else {
      await employeePage
        .getByRole('menuitem', { name: ownCompanyName, exact: true })
        .click();
      await expect(
        employeePage.getByText('İşletme değiştirildi')
      ).toBeVisible();
    }

    await employeePage.goto('/sales-history');
    await expect(
      employeePage.getByRole('heading', { name: 'Satış Geçmişi' })
    ).toBeVisible();
    await switchCompany(employeePage, hostCompanyName);

    await expect(
      employeePage.getByText(hostInvoiceNumber, { exact: true })
    ).toBeVisible();
    await employeePage.reload();
    await expect(
      employeePage.getByText(hostInvoiceNumber, { exact: true })
    ).toBeVisible();
  });
});
