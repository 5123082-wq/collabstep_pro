import { test, expect } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';

const appOrigin = 'http://127.0.0.1:3000';

test.describe('project tasks workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin', appOrigin);
  });

  test('kanban drag-and-drop and list hierarchy toggles', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    const projectRes = await page.request.post(`${appOrigin}/api/pm/projects`, {
      data: { title: 'E2E Tasks Board Project' }
    });
    if (projectRes.status() >= 400) {
      const body = await projectRes.text();
      throw new Error(`Создание проекта для доски задач не удалось: ${projectRes.status()} ${body}`);
    }
    const projectJson = await projectRes.json();
    const projectId = projectJson?.data?.project?.id ?? projectJson?.project?.id;
    if (!projectId) {
      throw new Error('Не удалось создать проект для доски задач');
    }

    const taskRes = await page.request.post(`${appOrigin}/api/pm/tasks`, {
      data: { projectId, title: 'E2E Kanban Task', status: 'in_progress' }
    });
    if (taskRes.status() >= 400) {
      const body = await taskRes.text();
      throw new Error(`Создание задачи для доски не удалось: ${taskRes.status()} ${body}`);
    }
    const taskJson = await taskRes.json();
    const taskId = taskJson?.data?.task?.id ?? taskJson?.task?.id;
    if (!taskId) {
      throw new Error('Не удалось создать задачу для доски');
    }

    await page.goto(`${appOrigin}/pm/tasks?projectId=${projectId}&view=board&scope=all&pageSize=1000`);
    await expect(page.getByRole('heading', { level: 1, name: 'Задачи' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Board' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();

    const createdCard = page.locator(`[data-task-id="${taskId}"]`).first();
    await expect(createdCard).toBeVisible({ timeout: 10000 });

    expect(logs).toEqual([]);
  });
});
