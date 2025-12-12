import { test, expect } from '@playwright/test';
import { loginAsDemo } from './utils/auth';
import { captureConsole } from './utils/console';

const appOrigin = 'http://localhost:3000';

test.describe('marketplace route stability', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('состояние фильтров восстанавливается после перезагрузки', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    const query = new URLSearchParams({
      role: 'Продуктовый дизайнер',
      skills: 'Figma',
      format: 'remote',
      lang: 'ru'
    }).toString();

    await page.goto(`${appOrigin}/app/marketplace/specialists?${query}`);

    await expect(page.getByLabel('Роль')).toHaveValue('Продуктовый дизайнер');
    await expect(page.getByRole('checkbox', { name: 'Figma', exact: true })).toBeChecked();
    await expect(page.getByLabel('Формат')).toHaveValue('remote');
    await expect(page.getByLabel('Язык')).toHaveValue('ru');

    await page.reload();

    await expect(page.getByLabel('Роль')).toHaveValue('Продуктовый дизайнер');
    await expect(page.getByRole('checkbox', { name: 'Figma', exact: true })).toBeChecked();
    await expect(page.getByLabel('Формат')).toHaveValue('remote');
    await expect(page.getByLabel('Язык')).toHaveValue('ru');

    expect(logs).toEqual([]);
  });
});
