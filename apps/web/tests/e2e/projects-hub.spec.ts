import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('projects overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('renders projects and tabs without console errors', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/projects`);
    await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Мои' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Я участник' })).toBeVisible();
    await expect(page.getByTestId('project-card').first()).toBeVisible();

    expect(logs.filter((message) => /error/i.test(message))).toEqual([]);
  });

  test('filters projects by status and resets filters', async ({ page }) => {
    await page.goto(`${appOrigin}/app/projects`);
    await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

    const cards = page.getByTestId('project-card');
    await expect(cards).toHaveCount(2);

    await page.getByLabel('Статус').selectOption('ARCHIVED');
    await expect(cards).toHaveCount(1);
    await expect(cards.first().getByRole('link', { name: /Редизайн лендинга/ })).toBeVisible();

    await page.getByRole('button', { name: 'Сбросить' }).click();
    await expect(cards).toHaveCount(2);
  });

  test('shows empty state when switching to member tab', async ({ page }) => {
    await page.goto(`${appOrigin}/app/projects`);
    await expect(page.getByTestId('project-card').first()).toBeVisible();

    await page.getByRole('button', { name: 'Я участник' }).click();
    await expect(page.getByText('Проекты не найдены')).toBeVisible();
  });
});
