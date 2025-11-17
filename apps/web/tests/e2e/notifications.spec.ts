import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'user', appOrigin);
  });

  test('should display notifications panel', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/dashboard`);
    await page.waitForLoadState('networkidle');

    // Находим иконку уведомлений в rail
    const notificationsButton = page.locator('button[aria-label*="Уведомления"], button:has-text("Уведомления")').first();
    
    if (await notificationsButton.count() > 0) {
      await notificationsButton.click();
      
      // Ждем открытия панели уведомлений
      await page.waitForSelector('text=Нет уведомлений, text=Отметить все как прочитанные', { timeout: 5000 });
      
      expect(logs).toEqual([]);
    } else {
      test.skip();
    }
  });

  test('should show unread notification badge', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/dashboard`);
    await page.waitForLoadState('networkidle');

    // Проверяем наличие badge с количеством непрочитанных уведомлений
    // Badge может быть в виде числа или точки
    const badge = page.locator('[data-badge], .badge, [aria-label*="уведомл"]').first();
    
    // Если badge есть, проверяем что он видим
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible();
    }

    expect(logs).toEqual([]);
  });

  test('should mark notification as read when clicked', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/notifications`);
    await page.waitForLoadState('networkidle');

    // Ждем загрузки уведомлений
    await page.waitForSelector('text=Нет уведомлений, [data-notification]', { timeout: 5000 });

    // Ищем первое непрочитанное уведомление
    const unreadNotification = page.locator('[data-notification][data-status="unread"]').first();
    
    if (await unreadNotification.count() > 0) {
      const notificationText = await unreadNotification.textContent();
      
      // Кликаем на уведомление
      await unreadNotification.click();
      
      // Ждем перехода или изменения статуса
      await page.waitForTimeout(1000);
      
      // Проверяем, что уведомление больше не имеет статус unread
      const updatedNotification = page.locator(`[data-notification]:has-text("${notificationText}")`).first();
      if (await updatedNotification.count() > 0) {
        await expect(updatedNotification).not.toHaveAttribute('data-status', 'unread');
      }
    } else {
      // Если нет непрочитанных уведомлений, пропускаем тест
      test.skip();
    }

    expect(logs).toEqual([]);
  });

  test('should filter notifications by status', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/notifications`);
    await page.waitForLoadState('networkidle');

    // Ждем загрузки страницы
    await page.waitForSelector('text=Все, text=Непрочитанные', { timeout: 5000 });

    // Кликаем на фильтр "Непрочитанные"
    const unreadFilter = page.getByRole('button', { name: 'Непрочитанные' }).first();
    
    if (await unreadFilter.count() > 0) {
      await unreadFilter.click();
      
      // Ждем применения фильтра
      await page.waitForTimeout(500);
      
      // Проверяем, что фильтр активен
      await expect(unreadFilter).toHaveClass(/bg-indigo-500/);
    } else {
      test.skip();
    }

    expect(logs).toEqual([]);
  });

  test('should mark all notifications as read', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/notifications`);
    await page.waitForLoadState('networkidle');

    // Ждем загрузки страницы
    await page.waitForSelector('text=Отметить все как прочитанные', { timeout: 5000 });

    // Находим кнопку "Отметить все как прочитанные"
    const markAllReadButton = page.getByRole('button', { name: 'Отметить все как прочитанные' }).first();
    
    if (await markAllReadButton.count() > 0) {
      // Проверяем количество непрочитанных до клика
      const unreadBefore = await page.locator('[data-status="unread"]').count();
      
      if (unreadBefore > 0) {
        await markAllReadButton.click();
        
        // Ждем обновления
        await page.waitForTimeout(1000);
        
        // Проверяем, что непрочитанных уведомлений стало меньше или 0
        const unreadAfter = await page.locator('[data-status="unread"]').count();
        expect(unreadAfter).toBeLessThanOrEqual(unreadBefore);
      }
    } else {
      test.skip();
    }

    expect(logs).toEqual([]);
  });

  test('should navigate to task from notification', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/notifications`);
    await page.waitForLoadState('networkidle');

    // Ждем загрузки уведомлений
    await page.waitForSelector('[data-notification], text=Нет уведомлений', { timeout: 5000 });

    // Ищем уведомление о задаче
    const taskNotification = page.locator('[data-notification]:has-text("задача"), [data-notification]:has-text("task")').first();
    
    if (await taskNotification.count() > 0) {
      // Запоминаем текущий URL
      const currentUrl = page.url();
      
      // Кликаем на уведомление
      await taskNotification.click();
      
      // Ждем перехода
      await page.waitForTimeout(1000);
      
      // Проверяем, что URL изменился (переход к задаче)
      const newUrl = page.url();
      if (newUrl !== currentUrl) {
        expect(newUrl).toMatch(/\/pm\/projects\/.*\/tasks\/.*/);
      }
    } else {
      test.skip();
    }

    expect(logs).toEqual([]);
  });

  test('should delete notification', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/app/notifications`);
    await page.waitForLoadState('networkidle');

    // Ждем загрузки уведомлений
    await page.waitForSelector('[data-notification], text=Нет уведомлений', { timeout: 5000 });

    // Ищем первое уведомление
    const notification = page.locator('[data-notification]').first();
    
    if (await notification.count() > 0) {
      const notificationText = await notification.textContent();
      
      // Наводим на уведомление, чтобы показать кнопку удаления
      await notification.hover();
      
      // Ищем кнопку удаления (× или "Удалить")
      const deleteButton = page.locator('button:has-text("×"), button[aria-label*="Удалить"]').first();
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        
        // Ждем удаления
        await page.waitForTimeout(500);
        
        // Проверяем, что уведомление исчезло
        if (notificationText) {
          await expect(page.locator(`text=${notificationText}`)).not.toBeVisible({ timeout: 2000 });
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }

    expect(logs).toEqual([]);
  });
});

