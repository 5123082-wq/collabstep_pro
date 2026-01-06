import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import {
  organizations,
  projects as projectsTable
} from '@collabverse/api/db/schema';
import { tasksRepository, isPmDbEnabled } from '@collabverse/api';
import { sql } from '@vercel/postgres';
import { sql as drizzleSql, isNull, and } from 'drizzle-orm';

async function cleanupOrphanedProjects() {
  try {
    console.log('🧹 Очистка "осиротевших" проектов...\n');

    // 1. Найти проекты без организаций
    const projectsWithoutOrgs = await db
      .select()
      .from(projectsTable)
      .where(isNull(projectsTable.organizationId));

    console.log(`📂 Найдено проектов без организаций: ${projectsWithoutOrgs.length}`);

    // 2. Найти проекты с несуществующими организациями
    const allOrgIds = new Set(
      (await db.select({ id: organizations.id }).from(organizations)).map((o) => o.id)
    );

    const allProjects = await db.select().from(projectsTable);
    const projectsWithInvalidOrgs = allProjects.filter(
      (p) => p.organizationId !== null && !allOrgIds.has(p.organizationId)
    );

    console.log(`🔍 Найдено проектов с несуществующими организациями: ${projectsWithInvalidOrgs.length}`);

    // 3. Найти проекты без задач
    // Задачи хранятся и в памяти, и в БД (таблица pm_tasks)
    const projectIdsWithTasks = new Set<string>();
    
    // Сначала проверяем БД, если она включена
    if (isPmDbEnabled()) {
      try {
        const TABLE_TASKS = 'pm_tasks';
        const tasksFromDb = await sql.query(`SELECT DISTINCT project_id FROM ${TABLE_TASKS} WHERE project_id IS NOT NULL`);
        if (tasksFromDb.rows && Array.isArray(tasksFromDb.rows)) {
          for (const row of tasksFromDb.rows) {
            if (row && row.project_id && typeof row.project_id === 'string') {
              projectIdsWithTasks.add(row.project_id);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️  Не удалось загрузить задачи из БД, используем память:', error);
        // Fallback на память
        const allTasks = tasksRepository.list();
        for (const task of allTasks) {
          if (task && task.projectId) {
            projectIdsWithTasks.add(task.projectId);
          }
        }
      }
    } else {
      // Если БД не включена, используем только память
      const allTasks = tasksRepository.list();
      for (const task of allTasks) {
        if (task && task.projectId) {
          projectIdsWithTasks.add(task.projectId);
        }
      }
    }
    const orphanedProjectsNoTasks = allProjects.filter((p) => !projectIdsWithTasks.has(p.id));

    console.log(`📋 Найдено проектов без задач: ${orphanedProjectsNoTasks.length}\n`);

    // 4. Определить проекты для удаления
    const projectsToDelete = new Set<string>();

    // Проекты без организаций И без задач
    projectsWithoutOrgs.forEach((p) => {
      if (!projectIdsWithTasks.has(p.id)) {
        projectsToDelete.add(p.id);
        console.log(`   🗑️  Будет удален: ${p.name} (${p.id}) - нет организации и задач`);
      }
    });

    // Проекты с несуществующими организациями И без задач
    projectsWithInvalidOrgs.forEach((p) => {
      if (!projectIdsWithTasks.has(p.id)) {
        projectsToDelete.add(p.id);
        console.log(`   🗑️  Будет удален: ${p.name} (${p.id}) - несуществующая организация и нет задач`);
      }
    });

    if (projectsToDelete.size === 0) {
      console.log('✅ Нет проектов для удаления\n');
      return;
    }

    console.log(`\n⚠️  ВНИМАНИЕ: Будет удалено ${projectsToDelete.size} проектов!`);
    console.log('   Для подтверждения удаления установите переменную окружения: CONFIRM_DELETE=yes\n');

    if (process.env.CONFIRM_DELETE !== 'yes') {
      console.log('❌ Удаление отменено. Установите CONFIRM_DELETE=yes для подтверждения.');
      return;
    }

    // 5. Удалить проекты
    console.log('🗑️  Удаление проектов...');
    const projectIdsArray = Array.from(projectsToDelete);

    // Получить информацию о проектах перед удалением
    const projectsToDeleteInfo = await db
      .select()
      .from(projectsTable)
      .where(sql`${projectsTable.id} = ANY(${projectIdsArray})`);

    // Удалить связанные задачи (если есть)
    // Задачи хранятся и в памяти, и в БД (таблица pm_tasks)
    for (const projectId of projectIdsArray) {
      let deletedCount = 0;
      
      // Удалить из памяти
      const projectTasks = tasksRepository.list({ projectId });
      for (const task of projectTasks) {
        tasksRepository.delete(task.id);
        deletedCount++;
      }
      
      // Удалить из БД, если она включена
      if (isPmDbEnabled()) {
        try {
          const TABLE_TASKS = 'pm_tasks';
          const TABLE_TASK_COMMENTS = 'pm_task_comments';
          // Удалить комментарии к задачам
          await sql.query(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE project_id = $1`, [projectId]);
          // Удалить задачи
          const deleteResult = await sql.query(`DELETE FROM ${TABLE_TASKS} WHERE project_id = $1`, [projectId]);
          if (deleteResult.rowCount && deleteResult.rowCount > 0) {
            deletedCount = Math.max(deletedCount, deleteResult.rowCount);
          }
        } catch (error) {
          console.warn(`   ⚠️  Не удалось удалить задачи из БД для проекта ${projectId}:`, error);
        }
      }
      
      if (deletedCount > 0) {
        console.log(`   🗑️  Удалено задач для проекта ${projectId}: ${deletedCount}`);
      }
    }

    // Удалить проекты
    for (const projectInfo of projectsToDeleteInfo) {
      await db.delete(projectsTable).where(sql`${projectsTable.id} = ${projectInfo.id}`);
      console.log(`   ✅ Удален проект: ${projectInfo.name} (${projectInfo.id})`);
    }

    console.log(`\n✅ Успешно удалено ${projectsToDelete.size} проектов`);
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

cleanupOrphanedProjects();

