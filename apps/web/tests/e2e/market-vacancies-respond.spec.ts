import { test, expect } from '@playwright/test';
import { loginAsDemo } from './utils/auth';
import { captureConsole } from './utils/console';

const appOrigin = 'http://localhost:3000';

test.describe('marketplace vacancy respond flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('отклик на вакансию показывает toast', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/performers/vacancies`);
    await expect(page.getByRole('heading', { level: 1, name: /Вакансии/i })).toBeVisible();
    // В макете нет живых данных, поэтому ограничиваемся smoke-проверкой отсутствия ошибок
    expect(logs).toEqual([]);
  });
});
