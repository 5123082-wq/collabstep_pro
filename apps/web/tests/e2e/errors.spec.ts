import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('error boundaries and fallbacks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('unknown project shows not-found page', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    const response = await page.goto(`${appOrigin}/project/UNKNOWN/overview`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Проект не найден')).toBeVisible();
    await expect(page.getByRole('link', { name: 'К списку проектов' })).toBeVisible();
    expect(logs).toEqual([]);
  });

  test('project analytics error recovers after retry', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await page.goto(`${appOrigin}/project/DEMO/analytics?fail=1&session=${sessionId}`);
    await expect(page.getByText('Не удалось открыть проект')).toBeVisible();
    await page.getByRole('button', { name: 'Повторить попытку' }).click();
    await page.waitForURL('**/project/DEMO/analytics');
    await expect(page.getByRole('heading', { name: 'Дашборды' })).toBeVisible();
    expect(logs).toEqual([]);
  });
});
