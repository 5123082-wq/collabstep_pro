import { test, expect, type Locator, type Page } from '@playwright/test';
import { captureConsole } from './utils/console';
import { loginAsDemo } from './utils/auth';
import { TEST_PROJECT_DEMO_ID } from '@collabverse/api';

const appOrigin = 'http://127.0.0.1:3000';

async function dragCard(page: Page, source: Locator, targetColumn: Locator) {
  await source.scrollIntoViewIfNeeded();
  await targetColumn.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Unable to read drag and drop coordinates');
  }
  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + Math.min(targetBox.height / 2, 200);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
}

test.describe('project tasks workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'user', appOrigin);
  });

  test('kanban drag-and-drop and list hierarchy toggles', async ({ page }) => {
    const logs: string[] = [];
    captureConsole(page, logs);

    await page.goto(`${appOrigin}/pm/projects/${TEST_PROJECT_DEMO_ID}/tasks`);
    const kanbanView = page.locator('[data-view-mode="kanban"]');
    await expect(kanbanView).toBeVisible();

    const inProgressCard = page
      .locator('[data-status="in_progress"] [data-task-id="task-test-planning-roadmap"]')
      .first();
    await inProgressCard.waitFor({ state: 'visible' });

    const reviewColumn = page.locator('[data-status="review"]').first();
    await dragCard(page, inProgressCard, reviewColumn);
    await expect(
      page.locator('[data-status="review"] [data-task-id="task-test-planning-roadmap"]')
    ).toBeVisible();

    const reviewCard = page
      .locator('[data-status="review"] [data-task-id="task-test-planning-roadmap"]')
      .first();
    await reviewCard.waitFor({ state: 'visible' });
    const progressColumn = page.locator('[data-status="in_progress"]').first();
    await dragCard(page, reviewCard, progressColumn);
    await expect(
      page.locator('[data-status="in_progress"] [data-task-id="task-test-planning-roadmap"]')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Список' }).click();
    const listView = page.locator('[data-view-mode="list"]');
    await expect(listView).toBeVisible();

    const epicRow = listView.locator('[data-task-row-id="task-test-planning"]').first();
    await expect(epicRow).toBeVisible();
    const childRow = listView.locator('[data-task-row-id="task-test-planning-research"]').first();
    await expect(childRow).toBeVisible();

    await epicRow.getByRole('button', { name: 'Свернуть ветку' }).click();
    await expect(childRow).toBeHidden();

    await epicRow.getByRole('button', { name: 'Развернуть ветку' }).click();
    await expect(childRow).toBeVisible();

    await expect(listView.locator('[data-task-row-id="task-test-design-mockups"]').first()).toBeVisible();

    expect(logs).toEqual([]);
  });
});
