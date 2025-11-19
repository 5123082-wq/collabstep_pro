/**
 * E2E tests for Advanced AI functionality
 * 
 * Tests for:
 * - Project structure generation flow
 * - Workload analysis UI
 * - Bulk operations
 * - Assignment recommendations
 */

import { test, expect } from '@playwright/test';

// Helper to setup test project
async function setupTestProject(page: any) {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  // Create test project
  await page.click('text=Создать проект');
  await page.fill('[name="title"]', 'AI Test Project');
  await page.fill('[name="description"]', 'Project for AI testing');
  await page.click('button:has-text("Создать")');
  await expect(page).toHaveURL(/\/pm\/projects\//);

  const projectId = page.url().split('/').pop();
  return projectId;
}

test.describe('AI Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI API responses
    await page.route('**/api/ai/**', (route) => {
      const url = route.request().url();

      if (url.includes('/generate-project-structure')) {
        void route.fulfill({
          status: 200,
          body: JSON.stringify({
            structure: {
              phases: [
                {
                  name: 'Разработка',
                  description: 'Основная разработка',
                  tasks: [
                    {
                      title: 'Создать API',
                      description: 'Разработать REST API',
                      estimatedDays: 5,
                      priority: 'high'
                    },
                    {
                      title: 'Создать UI',
                      description: 'Разработать пользовательский интерфейс',
                      estimatedDays: 7,
                      priority: 'high'
                    }
                  ]
                },
                {
                  name: 'Тестирование',
                  description: 'Тестирование приложения',
                  tasks: [
                    {
                      title: 'Написать тесты',
                      description: 'Unit и E2E тесты',
                      estimatedDays: 3,
                      priority: 'med'
                    }
                  ]
                }
              ],
              estimatedTotalDays: 15,
              suggestedTeamSize: 3,
              risks: ['Риск задержки с API', 'Риск проблем с интеграцией'],
              recommendations: ['Начать с API разработки', 'Использовать CI/CD']
            }
          })
        });
      } else if (url.includes('/analyze-workload')) {
        void route.fulfill({
          status: 200,
          body: JSON.stringify({
            analysis: {
              members: [
                {
                  userId: 'user-1',
                  userName: 'Test User',
                  activeTasks: 5,
                  estimatedHours: 40,
                  upcomingDeadlines: 2,
                  overloadLevel: 'medium',
                  capacity: 80
                }
              ],
              overloadedMembers: [],
              underutilizedMembers: [],
              recommendations: ['Распределение загрузки оптимальное']
            }
          })
        });
      } else {
        void route.continue();
      }
    });
  });

  test.skip('should generate project structure from description', async ({ page }) => {
    await setupTestProject(page);

    // Open AI planner
    await page.click('text=AI Планирование');
    await expect(page.locator('text=Планирование проекта через AI')).toBeVisible();

    // Enter project description
    await page.fill('textarea[placeholder*="Опишите проект"]',
      'Создать веб-приложение для управления задачами с REST API и современным UI');

    // Generate structure
    await page.click('button:has-text("Сгенерировать структуру")');
    await expect(page.locator('text=Генерация...')).toBeVisible();

    // Wait for results
    await expect(page.locator('text=Предпросмотр структуры проекта')).toBeVisible({ timeout: 10000 });

    // Verify structure is displayed
    await expect(page.locator('text=Разработка')).toBeVisible();
    await expect(page.locator('text=Создать API')).toBeVisible();
    await expect(page.locator('text=Создать UI')).toBeVisible();
    await expect(page.locator('text=Тестирование')).toBeVisible();

    // Verify summary
    await expect(page.locator('text=Оценка времени: 15 дней')).toBeVisible();
    await expect(page.locator('text=Рекомендуемая команда: 3 человека')).toBeVisible();

    // Verify risks and recommendations
    await expect(page.locator('text=Потенциальные риски')).toBeVisible();
    await expect(page.locator('text=Рекомендации')).toBeVisible();

    // Apply structure
    await page.click('button:has-text("Применить структуру")');
    await expect(page.locator('text=Применение...')).toBeVisible();
    await expect(page.locator('text=Структура проекта применена')).toBeVisible({ timeout: 10000 });
  });

  test.skip('should analyze team workload', async ({ page }) => {
    const projectId = await setupTestProject(page);

    // Create some tasks first
    await page.click('text=Создать задачу');
    await page.fill('[name="title"]', 'Test Task 1');
    await page.click('button:has-text("Создать")');

    // Open workload analysis
    await page.click('text=Анализ загруженности');
    await expect(page.locator('text=Анализ загруженности команды')).toBeVisible();

    // Run analysis
    await page.click('button:has-text("Проанализировать")');
    await expect(page.locator('text=Анализ...')).toBeVisible();

    // Wait for results
    await expect(page.locator('text=Загруженность участников')).toBeVisible({ timeout: 10000 });

    // Verify workload data
    await expect(page.locator('text=Test User')).toBeVisible();
    await expect(page.locator('text=Активных задач: 5')).toBeVisible();
    await expect(page.locator('text=Оценка времени: 40ч')).toBeVisible();
    await expect(page.locator('text=80%')).toBeVisible(); // Capacity

    // Verify recommendations
    await expect(page.locator('text=Рекомендации')).toBeVisible();
  });

  test.skip('should execute bulk operations with AI commands', async ({ page }) => {
    const projectId = await setupTestProject(page);

    // Create some tasks
    for (let i = 1; i <= 3; i++) {
      await page.click('text=Создать задачу');
      await page.fill('[name="title"]', `Task ${i}`);
      await page.selectOption('[name="status"]', 'in_progress');
      await page.click('button:has-text("Создать")');
    }

    // Mock bulk operations API
    await page.route('**/api/pm/tasks/bulk-update', (route) => {
      void route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            updatedCount: 3
          }
        })
      });
    });

    await page.route('**/api/ai/**', (route) => {
      const url = route.request().url();

      // Mock for parseBulkCommand (called by BulkOperationsPanel)
      void route.fulfill({
        status: 200,
        body: JSON.stringify({
          operation: {
            type: 'update_status',
            filter: {
              status: 'in_progress'
            },
            updates: {
              status: 'done'
            },
            affectedCount: 3
          },
          confidence: 0.95,
          interpretation: 'Изменить статус всех задач в работе на готово',
          warnings: []
        })
      });
    });

    // Open bulk operations panel
    await page.click('text=Массовые операции');
    await expect(page.locator('text=Массовые операции через AI')).toBeVisible();

    // Enter command
    await page.fill('textarea[placeholder*="Например"]',
      'Измени статус всех задач в работе на готово');

    // Parse command
    await page.click('button:has-text("Распознать команду")');
    await expect(page.locator('text=Распознавание...')).toBeVisible();

    // Verify interpretation
    await expect(page.locator('text=AI понял команду как')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Изменить статус всех задач в работе на готово')).toBeVisible();
    await expect(page.locator('text=Затронет задач: 3')).toBeVisible();

    // Execute operation
    await page.click('button:has-text("Выполнить операцию")');
    await expect(page.locator('text=Выполнение...')).toBeVisible();
    await expect(page.locator('text=Успешно обновлено 3 задач')).toBeVisible({ timeout: 10000 });
  });

  test.skip('should use example commands in bulk operations', async ({ page }) => {
    await setupTestProject(page);

    // Open bulk operations panel
    await page.click('text=Массовые операции');
    await expect(page.locator('text=Примеры команд')).toBeVisible();

    // Click on first example
    await page.locator('button:has-text("Измени статус всех задач")').first().click();

    // Verify command is filled
    const textarea = page.locator('textarea[placeholder*="Например"]');
    await expect(textarea).not.toHaveValue('');
  });

  test.skip('should show workload visualization with capacity bars', async ({ page }) => {
    await setupTestProject(page);

    // Open workload analysis and run it
    await page.click('text=Анализ загруженности');
    await page.click('button:has-text("Проанализировать")');

    // Wait for results
    await expect(page.locator('text=Загруженность участников')).toBeVisible({ timeout: 10000 });

    // Verify capacity bar is visible
    const capacityBar = page.locator('div[class*="h-2"]').first();
    await expect(capacityBar).toBeVisible();

    // Verify summary stats
    await expect(page.locator('text=Всего участников')).toBeVisible();
    await expect(page.locator('text=Перегружено')).toBeVisible();
    await expect(page.locator('text=Недозагружено')).toBeVisible();
  });

  test.skip('should handle AI errors gracefully', async ({ page }) => {
    await setupTestProject(page);

    // Mock AI error
    await page.route('**/api/ai/generate-project-structure', (route) => {
      void route.fulfill({
        status: 503,
        body: JSON.stringify({
          error: 'AI service is not configured'
        })
      });
    });

    // Try to generate structure
    await page.click('text=AI Планирование');
    await page.fill('textarea[placeholder*="Опишите проект"]', 'Test project');
    await page.click('button:has-text("Сгенерировать структуру")');

    // Verify error message
    await expect(page.locator('text=AI service is not configured')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should persist bulk operations history', async ({ page }) => {
    await setupTestProject(page);

    // Mock successful bulk operation
    await page.route('**/api/pm/tasks/bulk-update', (route) => {
      void route.fulfill({
        status: 200,
        body: JSON.stringify({ data: { updatedCount: 2 } })
      });
    });

    // Execute a bulk operation
    await page.click('text=Массовые операции');
    await page.fill('textarea[placeholder*="Например"]', 'Тестовая команда');
    await page.click('button:has-text("Распознать команду")');
    await page.click('button:has-text("Выполнить операцию")');

    // Wait for completion
    await expect(page.locator('text=Успешно обновлено')).toBeVisible({ timeout: 10000 });

    // Refresh page
    await page.reload();
    await page.click('text=Массовые операции');

    // Verify history is shown
    await expect(page.locator('text=История операций')).toBeVisible();
    await expect(page.locator('text=Тестовая команда')).toBeVisible();
  });
});
