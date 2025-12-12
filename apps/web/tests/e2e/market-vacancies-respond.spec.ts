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

    await page.goto(`${appOrigin}/app/marketplace/vacancies`);
    await expect(page.getByRole('heading', { level: 1, name: 'Вакансии' })).toBeVisible();

    await Promise.all([
      page.waitForURL('**/app/marketplace/vacancies/**'),
      page.getByRole('link', { name: 'Подробнее' }).first().click()
    ]);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('main').getByRole('button', { name: 'Откликнуться' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Отклик на вакансию' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Имя').fill('Тестовый кандидат');
    await dialog.getByLabel('Контакты (email или мессенджер)').fill('candidate@example.com');
    await dialog.getByLabel('Комментарий').fill('Готов обсудить детали.');
    await dialog.getByLabel('Ссылки на портфолио').fill('https://example.com');

    await dialog.getByRole('button', { name: 'Отправить отклик' }).click();
    const toast = page.getByText('Отклик отправлен');
    await expect(toast).toBeVisible();
    expect(logs).toEqual([]);
  });
});
