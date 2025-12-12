import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('Task Comments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('should create a comment', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    // Переходим на страницу задач
    await page.goto(`${appOrigin}/pm/tasks`);
    await page.waitForLoadState('networkidle');

    // Находим первую задачу и кликаем на неё
    const firstTask = page.locator('[data-task-card]').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      
      // Ждем открытия drawer с деталями задачи
      await page.waitForSelector('text=Комментарии', { timeout: 5000 });

      // Находим textarea для комментария
      const commentTextarea = page.locator('textarea[placeholder*="Написать комментарий"]').first();
      await expect(commentTextarea).toBeVisible();

      // Вводим комментарий
      await commentTextarea.fill('Тестовый комментарий для E2E теста');

      // Отправляем комментарий
      const submitButton = page.getByRole('button', { name: 'Отправить' }).first();
      await submitButton.click();

      // Проверяем, что комментарий появился
      await expect(page.locator('text=Тестовый комментарий для E2E теста')).toBeVisible({ timeout: 5000 });

      expect(logs).toEqual([]);
    } else {
      // Если нет задач, пропускаем тест
      test.skip();
    }
  });

  test('should reply to a comment', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/pm/tasks`);
    await page.waitForLoadState('networkidle');

    const firstTask = page.locator('[data-task-card]').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      await page.waitForSelector('text=Комментарии', { timeout: 5000 });

      // Создаем первый комментарий
      const commentTextarea = page.locator('textarea[placeholder*="Написать комментарий"]').first();
      await commentTextarea.fill('Родительский комментарий');
      await page.getByRole('button', { name: 'Отправить' }).first().click();
      await expect(page.locator('text=Родительский комментарий')).toBeVisible({ timeout: 5000 });

      // Нажимаем "Ответить" на комментарий
      const replyButton = page.getByRole('button', { name: 'Ответить' }).first();
      await replyButton.click();

      // Вводим ответ
      const replyTextarea = page.locator('textarea[placeholder*="Написать комментарий"]').last();
      await replyTextarea.fill('Ответ на комментарий');
      await page.getByRole('button', { name: 'Отправить' }).last().click();

      // Проверяем, что ответ появился
      await expect(page.locator('text=Ответ на комментарий')).toBeVisible({ timeout: 5000 });

      expect(logs).toEqual([]);
    } else {
      test.skip();
    }
  });

  test('should edit a comment', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/pm/tasks`);
    await page.waitForLoadState('networkidle');

    const firstTask = page.locator('[data-task-card]').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      await page.waitForSelector('text=Комментарии', { timeout: 5000 });

      // Создаем комментарий
      const commentTextarea = page.locator('textarea[placeholder*="Написать комментарий"]').first();
      await commentTextarea.fill('Комментарий для редактирования');
      await page.getByRole('button', { name: 'Отправить' }).first().click();
      await expect(page.locator('text=Комментарий для редактирования')).toBeVisible({ timeout: 5000 });

      // Нажимаем "Редактировать"
      const editButton = page.getByRole('button', { name: 'Редактировать' }).first();
      await editButton.click();

      // Редактируем комментарий
      const editTextarea = page.locator('textarea[placeholder*="Редактировать комментарий"]').first();
      await editTextarea.fill('Отредактированный комментарий');
      await page.getByRole('button', { name: 'Сохранить' }).first().click();

      // Проверяем, что комментарий обновлен
      await expect(page.locator('text=Отредактированный комментарий')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Комментарий для редактирования')).not.toBeVisible();

      expect(logs).toEqual([]);
    } else {
      test.skip();
    }
  });

  test('should delete a comment', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/pm/tasks`);
    await page.waitForLoadState('networkidle');

    const firstTask = page.locator('[data-task-card]').first();
    if (await firstTask.count() > 0) {
      await firstTask.click();
      await page.waitForSelector('text=Комментарии', { timeout: 5000 });

      // Создаем комментарий
      const commentTextarea = page.locator('textarea[placeholder*="Написать комментарий"]').first();
      await commentTextarea.fill('Комментарий для удаления');
      await page.getByRole('button', { name: 'Отправить' }).first().click();
      await expect(page.locator('text=Комментарий для удаления')).toBeVisible({ timeout: 5000 });

      // Нажимаем "Удалить"
      const deleteButton = page.getByRole('button', { name: 'Удалить' }).first();
      
      // Обрабатываем диалог подтверждения
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Удалить комментарий');
        await dialog.accept();
      });

      await deleteButton.click();

      // Проверяем, что комментарий удален
      await expect(page.locator('text=Комментарий для удаления')).not.toBeVisible({ timeout: 5000 });

      expect(logs).toEqual([]);
    } else {
      test.skip();
    }
  });
});

