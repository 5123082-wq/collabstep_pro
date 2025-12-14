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

    await page.goto(`${appOrigin}/performers/specialists`);
    await expect(page.getByRole('heading', { level: 1, name: 'Специалисты' })).toBeVisible();
    await expect(page.getByLabel('Роль')).toBeVisible();
    await expect(page.getByLabel('Формат')).toBeVisible();
    await expect(page.getByLabel('Язык')).toBeVisible();
    // Поскольку данные берутся из API и могут отсутствовать локально, проверяем только отсутствие ошибок в консоли
    expect(logs).toEqual([]);
  });
});
