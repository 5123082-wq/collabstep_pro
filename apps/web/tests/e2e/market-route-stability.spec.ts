import { test, expect } from '@playwright/test';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('marketplace route stability', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('состояние фильтров восстанавливается после перезагрузки', async ({ page }) => {
    await page.goto(`${appOrigin}/performers/specialists`);

    await expect(page.getByLabel('Роль')).toBeVisible();
    await expect(page.getByLabel('Формат')).toBeVisible();
    await expect(page.getByLabel('Язык')).toBeVisible();

    await page.reload();

    await expect(page.getByLabel('Роль')).toBeVisible();
    await expect(page.getByLabel('Формат')).toBeVisible();
    await expect(page.getByLabel('Язык')).toBeVisible();
  });
});
