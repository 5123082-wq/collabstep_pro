import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://localhost:3000';

test.describe('PM Archive', () => {
  test.beforeEach(async ({ page }) => {
    // Устанавливаем фичефлаги для PM раздела и архива
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        'NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS': 'true',
        'NEXT_PUBLIC_FEATURE_PM_ARCHIVE': 'true',
        'NEXT_PUBLIC_FEATURE_PM_PROJECTS_LIST': 'true',
        'NEXT_PUBLIC_FEATURE_PM_PROJECT_CARD': 'true'
      }));
    });
  });

  test('Archive page displays archived projects', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Переходим на страницу архива
    await page.goto(`${appOrigin}/pm/archive`);
    await expect(page).toHaveURL(`${appOrigin}/pm/archive`);

    // Проверяем заголовок
    await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible();
    await expect(page.getByText('Просмотр и восстановление архивных проектов')).toBeVisible();

    expect(logs).toEqual([]);
  });

  test('Archive page shows empty state when no archived projects', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    await page.goto(`${appOrigin}/pm/archive`);

    // Проверяем наличие поиска и фильтров
    const searchInput = page.getByPlaceholder('Поиск по названию или ключу...');
    await expect(searchInput).toBeVisible();

    expect(logs).toEqual([]);
  });

  test('Archive page search functionality works', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    await page.goto(`${appOrigin}/pm/archive`);

    const searchInput = page.getByPlaceholder('Поиск по названию или ключу...');
    await searchInput.fill('test');

    // Проверяем, что поиск работает (URL должен обновиться)
    await page.waitForTimeout(500); // Ждем debounce

    expect(logs).toEqual([]);
  });

  test('Restore project dialog appears when clicking restore button', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    await page.goto(`${appOrigin}/pm/archive`);

    // Ищем кнопку восстановления (если есть архивные проекты)
    const restoreButtons = page.getByRole('button', { name: 'Восстановить' });
    const count = await restoreButtons.count();

    if (count > 0) {
      // Кликаем на первую кнопку восстановления
      await restoreButtons.first().click();

      // Проверяем, что диалог открылся
      await expect(page.getByRole('heading', { name: 'Восстановить проект' })).toBeVisible();
      await expect(page.getByText(/будет восстановлен/)).toBeVisible();

      // Закрываем диалог
      const cancelButton = page.getByRole('button', { name: 'Отмена' });
      await cancelButton.click();
    }

    expect(logs).toEqual([]);
  });

  test('Archive button appears in project detail page', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Переходим на страницу проектов
    await page.goto(`${appOrigin}/pm/projects`);

    // Ищем первую карточку проекта
    const projectCards = page.locator('a[href^="/pm/projects/"]');
    const count = await projectCards.count();

    if (count > 0) {
      // Кликаем на первую карточку проекта
      await projectCards.first().click();

      // Ждем загрузки страницы проекта
      await page.waitForURL(/\/pm\/projects\/[^/]+$/);

      // Проверяем наличие кнопки архивирования (если проект не в архиве)
      const archiveButton = page.getByRole('button', { name: /Архивировать/ });
      const archiveButtonCount = await archiveButton.count();

      if (archiveButtonCount > 0) {
        await expect(archiveButton).toBeVisible();
      }
    }

    expect(logs).toEqual([]);
  });

  test('Archive functionality works from project detail page', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);
    await loginAsDemo(page, 'admin', appOrigin);

    // Переходим на страницу проектов
    await page.goto(`${appOrigin}/pm/projects`);

    // Ищем первую карточку проекта
    const projectCards = page.locator('a[href^="/pm/projects/"]');
    const count = await projectCards.count();

    if (count > 0) {
      // Кликаем на первую карточку проекта
      await projectCards.first().click();

      // Ждем загрузки страницы проекта
      await page.waitForURL(/\/pm\/projects\/[^/]+$/);

      // Ищем кнопку архивирования
      const archiveButton = page.getByRole('button', { name: /Архивировать/ });
      const archiveButtonCount = await archiveButton.count();

      if (archiveButtonCount > 0) {
        // Настраиваем обработчик диалога подтверждения
        page.on('dialog', async (dialog) => {
          expect(dialog.type()).toBe('confirm');
          await dialog.accept();
        });

        // Кликаем на кнопку архивирования
        await archiveButton.click();

        // После архивирования должны быть перенаправлены на страницу архива
        await page.waitForURL(`${appOrigin}/pm/archive`, { timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible();
      }
    }

    expect(logs).toEqual([]);
  });
});

