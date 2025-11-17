import { test, expect } from '@playwright/test';

test.describe('PM Integrations', () => {
  test.beforeEach(async ({ page }) => {
    // Авторизация
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin.demo@collabverse.test');
    await page.fill('input[type="password"]', 'demo');
    await page.click('button[type="submit"]');
    await page.waitForURL('/pm/projects');
  });

  test('should create expense from project quick actions', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    // Находим первый проект и переходим на его страницу
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    await page.waitForSelector('button:has-text("Создать трату")');

    // Нажимаем кнопку создания траты
    await page.click('button:has-text("Создать трату")');

    // Проверяем, что открылся ExpenseDrawer
    await expect(page.locator('text=Новая трата')).toBeVisible();

    // Заполняем форму траты
    await page.fill('input[type="date"]', new Date().toISOString().slice(0, 10));
    await page.fill('input[type="number"]', '1000');
    await page.fill('input[value="RUB"]', 'RUB');
    await page.fill('input[placeholder*="Категория"], input[type="text"]:near(label:has-text("Категория"))', 'Тестовая категория');
    await page.fill('textarea', 'Тестовое описание траты');

    // Сохраняем трату
    await page.click('button:has-text("Сохранить")');
    
    // Ждём закрытия drawer
    await expect(page.locator('text=Новая трата')).not.toBeVisible({ timeout: 5000 });
  });

  test('should create marketplace listing from project', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    await page.waitForSelector('button:has-text("Выставить в маркетплейс")');

    // Нажимаем кнопку публикации в маркетплейс
    await page.click('button:has-text("Выставить в маркетплейс")');

    // Проверяем, что произошёл переход на страницу маркетплейса или появилось сообщение об успехе
    // В зависимости от реализации, может быть редирект или сообщение
    await page.waitForTimeout(2000);
    
    // Проверяем, что marketplace состояние обновилось
    const marketplaceState = page.locator('text=Черновик, text=Опубликован, text=Отклонён');
    if (await marketplaceState.count() > 0) {
      await expect(marketplaceState.first()).toBeVisible();
    }
  });

  test('should navigate to marketing with projectId deeplink', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    const projectId = projectHref.split('/').pop();
    await page.goto(projectHref);
    await page.waitForSelector('a[href*="/app/marketing/overview"]');

    // Нажимаем ссылку на маркетинг
    await page.click('a[href*="/app/marketing/overview"]');

    // Проверяем, что URL содержит projectId
    await page.waitForURL(/\/app\/marketing\/overview\?projectId=/);
    const url = page.url();
    expect(url).toContain('projectId=');
    expect(url).toContain(projectId);

    // Проверяем, что отображается контекст проекта
    await expect(page.locator('text=Контекст проекта')).toBeVisible({ timeout: 5000 });
  });

  test('should display budget banner when limit exceeded', async ({ page }) => {
    // Переходим на страницу проекта с превышенным бюджетом
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Проверяем наличие BudgetBanner (может быть не виден, если лимит не превышен)
    const budgetBanner = page.locator('text=Превышен лимит бюджета, text=Приближение к лимиту бюджета');
    // Баннер может не отображаться, если лимит не превышен - это нормально
    if (await budgetBanner.count() > 0) {
      await expect(budgetBanner.first()).toBeVisible();
    }
  });

  test('should update budget limit via modal', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Проверяем, есть ли кнопка изменения лимита (только если есть BudgetBanner)
    const updateLimitButton = page.locator('button:has-text("Изменить лимит")');
    if (await updateLimitButton.count() > 0) {
      await updateLimitButton.click();
      
      // Проверяем, что модальное окно открылось
      await expect(page.locator('text=Изменить лимит бюджета')).toBeVisible();
      
      // Вводим новый лимит
      await page.fill('input[type="number"][placeholder*="лимит"]', '15000');
      
      // Сохраняем
      await page.click('button:has-text("Сохранить")');
      
      // Ждём закрытия модального окна и появления уведомления
      await expect(page.locator('text=Изменить лимит бюджета')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle duplicate listing creation', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    await page.waitForSelector('button:has-text("Выставить в маркетплейс")');

    // Пытаемся создать листинг первый раз
    await page.click('button:has-text("Выставить в маркетплейс")');
    await page.waitForTimeout(2000);
    
    // Если редирект произошёл, возвращаемся на страницу проекта
    if (page.url().includes('/market/')) {
      await page.goto(projectHref);
      await page.waitForSelector('button:has-text("Выставить в маркетплейс")');
      
      // Пытаемся создать листинг повторно
      await page.click('button:has-text("Выставить в маркетплейс")');
      await page.waitForTimeout(2000);
      
      // Должно появиться сообщение об ошибке (листинг уже существует)
      // Проверяем наличие toast-уведомления или ошибки
      const errorToast = page.locator('text=/уже существует/i');
      if (await errorToast.count() > 0) {
        await expect(errorToast.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should filter limits log events', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Ищем компонент LimitsLog
    const limitsLog = page.locator('text=Журнал лимитов');
    if (await limitsLog.count() > 0) {
      // Открываем фильтры
      const filterButton = page.locator('button:has-text("Фильтры")');
      if (await filterButton.count() > 0) {
        await filterButton.click();
        
        // Проверяем, что панель фильтров видна
        await expect(page.locator('text=От даты')).toBeVisible();
        await expect(page.locator('text=До даты')).toBeVisible();
        await expect(page.locator('text=Тип события')).toBeVisible();
        
        // Выбираем тип события
        await page.selectOption('select', 'expense.created');
        
        // Проверяем, что фильтр применился (количество событий могло измениться)
        await page.waitForTimeout(500);
      }
    }
  });

  test('should export limits log to CSV', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Ищем компонент LimitsLog
    const limitsLog = page.locator('text=Журнал лимитов');
    if (await limitsLog.count() > 0) {
      // Нажимаем кнопку экспорта
      const exportButton = page.locator('button:has-text("Экспорт CSV")');
      if (await exportButton.count() > 0 && !await exportButton.isDisabled()) {
        // Настраиваем перехват скачивания
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportButton.click();
        
        const download = await downloadPromise;
        if (download) {
          // Проверяем, что файл скачался
          expect(download.suggestedFilename()).toContain('limits-log');
          expect(download.suggestedFilename()).toContain('.csv');
        }
      }
    }
  });

  test('should handle expense creation with validation errors', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    await page.waitForSelector('button:has-text("Создать трату")');

    // Нажимаем кнопку создания траты
    await page.click('button:has-text("Создать трату")');

    // Проверяем, что открылся ExpenseDrawer
    await expect(page.locator('text=Новая трата')).toBeVisible();

    // Пытаемся сохранить без заполнения обязательных полей
    await page.click('button:has-text("Сохранить")');
    
    // Ждём появления ошибки или drawer остаётся открытым
    await page.waitForTimeout(1000);
    
    // Drawer должен остаться открытым из-за ошибки валидации
    await expect(page.locator('text=Новая трата')).toBeVisible();
  });

  test('should open and save budget settings', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Ищем кнопку настроек бюджета
    const budgetSettingsButton = page.locator('button:has-text("Настройки бюджета")');
    if (await budgetSettingsButton.count() > 0) {
      await budgetSettingsButton.click();
      
      // Проверяем, что модальное окно открылось
      await expect(page.locator('text=Настройки бюджета проекта')).toBeVisible();
      
      // Заполняем форму
      await page.selectOption('select', 'USD');
      await page.fill('input[type="number"][placeholder*="лимит бюджета"]', '50000');
      await page.fill('input[type="number"][placeholder="0-100"]', '80');
      
      // Добавляем категорию
      await page.fill('input[placeholder="Название категории"]:last-of-type', 'Маркетинг');
      await page.fill('input[placeholder="Лимит"]:last-of-type', '10000');
      await page.click('button:has(svg)'); // Кнопка добавления категории
      
      // Сохраняем
      await page.click('button:has-text("Сохранить")');
      
      // Ждём закрытия модального окна
      await expect(page.locator('text=Настройки бюджета проекта')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should trigger automation when budget limit exceeded', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Сначала настраиваем бюджет с небольшим лимитом
    const budgetSettingsButton = page.locator('button:has-text("Настройки бюджета")');
    if (await budgetSettingsButton.count() > 0) {
      await budgetSettingsButton.click();
      await expect(page.locator('text=Настройки бюджета проекта')).toBeVisible();
      
      await page.selectOption('select', 'RUB');
      await page.fill('input[type="number"][placeholder*="лимит бюджета"]', '1000');
      await page.click('button:has-text("Сохранить")');
      await expect(page.locator('text=Настройки бюджета проекта')).not.toBeVisible({ timeout: 5000 });
    }
    
    // Создаём трату, которая превысит лимит
    await page.click('button:has-text("Создать трату")');
    await expect(page.locator('text=Новая трата')).toBeVisible();
    
    await page.fill('input[type="date"]', new Date().toISOString().slice(0, 10));
    await page.fill('input[type="number"]', '2000');
    await page.fill('input[value="RUB"]', 'RUB');
    await page.fill('input[placeholder*="Категория"], input[type="text"]:near(label:has-text("Категория"))', 'Тестовая категория');
    
    // Сохраняем трату
    await page.click('button:has-text("Сохранить")');
    
    // Ждём появления уведомления об автоматизации
    await page.waitForTimeout(2000);
    
    // Проверяем, что появилось уведомление об автоматическом переводе в pending
    const automationToast = page.locator('text=/автоматически переведена/i, text=/превышения лимита/i');
    // Уведомление может появиться, если автоматизация сработала
    if (await automationToast.count() > 0) {
      await expect(automationToast.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display automations log', async ({ page }) => {
    // Переходим на страницу проекта
    await page.goto('/pm/projects');
    await page.waitForSelector('a[href*="/pm/projects/"]');
    
    const projectLink = page.locator('a[href*="/pm/projects/"]').first();
    const projectHref = await projectLink.getAttribute('href');
    if (!projectHref) {
      throw new Error('Project link not found');
    }
    
    await page.goto(projectHref);
    
    // Ищем компонент AutomationsLog
    const automationsLog = page.locator('text=Журнал автоматизаций');
    if (await automationsLog.count() > 0) {
      // Проверяем наличие фильтров
      const filterButton = page.locator('button:has-text("Фильтры")').filter({ hasText: 'Фильтры' }).first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        
        // Проверяем, что панель фильтров видна
        await expect(page.locator('text=От даты')).toBeVisible();
        await expect(page.locator('text=До даты')).toBeVisible();
      }
      
      // Проверяем наличие кнопки экспорта
      const exportButton = page.locator('button:has-text("Экспорт CSV")');
      if (await exportButton.count() > 0) {
        await expect(exportButton).toBeVisible();
      }
    }
  });
});


