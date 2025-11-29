#!/usr/bin/env tsx
/**
 * Seeds demo projects/tasks/comments into Postgres so that serverless functions
 * share the same state. Requires DATABASE_URL and optional USE_DB_STORAGE (defaults to true).
 */
import 'dotenv/config';
import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID,
  projectsRepository,
  tasksRepository,
  commentsRepository
} from '@collabverse/api';
import { ensurePmTables, isPmDbEnabled } from '../apps/api/src/storage/pm-pg-adapter';
import { pmPgHydration } from '../apps/api/src/storage/pm-pg-bootstrap';
import { sql } from '@vercel/postgres';

async function hasData(): Promise<boolean> {
  const projects = await sql`SELECT COUNT(*)::int AS c FROM pm_projects`;
  const tasks = await sql`SELECT COUNT(*)::int AS c FROM pm_tasks`;
  return (projects.rows[0]?.c ?? 0) > 0 || (tasks.rows[0]?.c ?? 0) > 0;
}

async function main() {
  if (!isPmDbEnabled()) {
    throw new Error('DATABASE_URL is required to seed Postgres (set USE_DB_STORAGE=true if needed)');
  }

  await pmPgHydration;
  await ensurePmTables();

  if (await hasData()) {
    console.log('pm_projects/pm_tasks already contain data; skipping seed.');
    return;
  }

  console.log('Seeding demo project/tasks/comments into Postgres…');

  const project = projectsRepository.create({
    title: 'Тестовый проект с задачами и тратами',
    description: 'Проект для тестирования задач и комментариев в serverless.',
    ownerId: DEFAULT_WORKSPACE_USER_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    stage: 'build',
    type: 'product',
    visibility: 'public',
    budgetPlanned: 50000
  });

  const baseTasks = [
    { title: 'Проектирование архитектуры системы', description: 'Создать архитектурную диаграмму', status: 'done' as const, priority: 'high' as const },
    { title: 'Разработка API для пользователей', description: 'Реализовать REST API', status: 'in_progress' as const, priority: 'high' as const },
    { title: 'Создание дизайн-макетов', description: 'Подготовить макеты экранов', status: 'review' as const, priority: 'med' as const },
    { title: 'Настройка CI/CD', description: 'Настроить автоматическую сборку', status: 'new' as const, priority: 'med' as const },
    { title: 'Интеграция с платежной системой', description: 'Подключить платежный шлюз', status: 'blocked' as const, priority: 'urgent' as const }
  ];

  const createdTasks = [];
  for (let i = 0; i < baseTasks.length; i++) {
    const t = baseTasks[i];
    if (!t) continue;
    const task = tasksRepository.create({
      projectId: project.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      startAt: new Date(Date.now() - (baseTasks.length - i) * 86400000).toISOString()
    });
    createdTasks.push(task);
  }

  // Add a couple of demo comments to the second task (API)
  const targetTask = createdTasks[1];
  if (targetTask) {
    const first = commentsRepository.create({
      projectId: project.id,
      taskId: targetTask.id,
      authorId: DEFAULT_WORKSPACE_USER_ID,
      body: 'Давайте уточним контракт и методы?'
    });
    commentsRepository.create({
      projectId: project.id,
      taskId: targetTask.id,
      authorId: DEFAULT_WORKSPACE_USER_ID,
      body: 'Проверил, нужен REST + вебхуки.',
      parentId: first.id
    });
  }

  console.log('Seed completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
