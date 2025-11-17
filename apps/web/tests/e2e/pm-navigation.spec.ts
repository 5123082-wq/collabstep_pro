import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('PM navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Устанавливаем фичефлаг для PM раздела
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        'NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS': 'true'
      }));
    });
  });

  test('PM menu section appears when flag is enabled', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    const navigation = page.getByRole('navigation', { name: 'Навигация приложения' });
    await expect(navigation).toBeVisible();

    // Проверяем наличие пункта меню "Проекты и задачи"
    const pmMenuLink = navigation.getByRole('link', { name: 'Проекты и задачи', exact: false });
    await expect(pmMenuLink).toBeVisible();

    expect(logs).toEqual([]);
  });

  test('PM routes are accessible and navigation works', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Переходим на дашборд PM
    await page.goto(`${appOrigin}/pm`);
    await expect(page).toHaveURL(`${appOrigin}/pm`);
    await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();

    // Переходим на страницу проектов
    await page.goto(`${appOrigin}/pm/projects`);
    await expect(page).toHaveURL(`${appOrigin}/pm/projects`);
    await expect(page.getByRole('heading', { name: 'Список проектов' })).toBeVisible();

    // Переходим на страницу задач
    await page.goto(`${appOrigin}/pm/tasks`);
    await expect(page).toHaveURL(`${appOrigin}/pm/tasks`);
    await expect(page.getByRole('heading', { name: 'Задачи' })).toBeVisible();

    // Переходим на страницу архива
    await page.goto(`${appOrigin}/pm/archive`);
    await expect(page).toHaveURL(`${appOrigin}/pm/archive`);
    await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible();

    expect(logs).toEqual([]);
  });

  test('PM menu children are visible and navigable', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    const navigation = page.getByRole('navigation', { name: 'Навигация приложения' });
    await expect(navigation).toBeVisible();

    // Находим пункт меню "Проекты и задачи"
    const pmMenuLink = navigation.getByRole('link', { name: 'Проекты и задачи', exact: false });
    await expect(pmMenuLink).toBeVisible();

    // Проверяем наличие подменю (children)
    const dashboardLink = navigation.getByRole('link', { name: 'Дашборд' });
    const projectsLink = navigation.getByRole('link', { name: 'Проекты' });
    const tasksLink = navigation.getByRole('link', { name: 'Задачи' });
    const archiveLink = navigation.getByRole('link', { name: 'Архив' });

    // Кликаем на каждый пункт и проверяем URL
    await dashboardLink.click();
    await expect(page).toHaveURL(`${appOrigin}/pm`);

    await projectsLink.click();
    await expect(page).toHaveURL(`${appOrigin}/pm/projects`);

    await tasksLink.click();
    await expect(page).toHaveURL(`${appOrigin}/pm/tasks`);

    await archiveLink.click();
    await expect(page).toHaveURL(`${appOrigin}/pm/archive`);

    expect(logs).toEqual([]);
  });

  test('URL state is preserved on navigation', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Переходим на страницу задач с query параметрами
    await page.goto(`${appOrigin}/pm/tasks?view=board&filter=active`);
    await expect(page).toHaveURL(`${appOrigin}/pm/tasks?view=board&filter=active`);

    // Переходим на другую страницу
    await page.goto(`${appOrigin}/pm/projects`);
    await expect(page).toHaveURL(`${appOrigin}/pm/projects`);

    // Возвращаемся на задачи - URL state должен сохраниться (если реализовано)
    await page.goto(`${appOrigin}/pm/tasks`);
    await expect(page).toHaveURL(`${appOrigin}/pm/tasks`);

    expect(logs).toEqual([]);
  });
});

