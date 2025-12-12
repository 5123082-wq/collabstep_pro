import { test, expect } from '@playwright/test';
import { loginAsDemo } from './utils/auth';
import { captureConsole } from './utils/console';

const appOrigin = 'http://localhost:3000';

test.describe('marketplace specialists', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('фильтры синхронизируются с URL и открывается визитка', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/marketplace/specialists`);
    await expect(page.getByRole('heading', { level: 1, name: 'Специалисты' })).toBeVisible();

    await page.getByLabel('Роль').selectOption('Продуктовый дизайнер');
    await page.getByRole('checkbox', { name: 'Figma', exact: true }).click();
    await page.getByLabel('Формат').selectOption('remote');
    await page.getByLabel('Язык').selectOption('ru');

    await expect.poll(() => {
      const url = new URL(page.url());
      const params = Object.fromEntries(url.searchParams.entries());
      return params;
    }).toMatchObject({
      role: 'Продуктовый дизайнер',
      skills: 'Figma',
      format: 'remote',
      lang: 'ru'
    });

    await expect(page.getByRole('checkbox', { name: 'Figma', exact: true })).toBeChecked();

    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toContainText('Продуктовый дизайнер');

    await Promise.all([
      page.waitForURL('**/p/**'),
      page.getByRole('link', { name: 'Открыть визитку' }).first().click()
    ]);

    await expect(page).toHaveURL(/\/p\//);
    expect(logs).toEqual([]);
  });
});
