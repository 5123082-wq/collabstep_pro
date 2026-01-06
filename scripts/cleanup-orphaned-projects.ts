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
  projects as projectsTable,
  tasks as tasksTable
} from '@collabverse/api/db/schema';
import { sql, isNull, and } from 'drizzle-orm';

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
    const projectsWithTasks = await db
      .selectDistinct({ projectId: tasksTable.projectId })
      .from(tasksTable);

    const projectIdsWithTasks = new Set(
      projectsWithTasks
        .map((t) => t?.projectId)
        .filter((id): id is string => Boolean(id))
    );
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
    for (const projectId of projectIdsArray) {
      const deletedTasks = await db
        .delete(tasksTable)
        .where(sql`${tasksTable.projectId} = ${projectId}`)
        .returning();
      if (deletedTasks.length > 0) {
        console.log(`   🗑️  Удалено задач для проекта ${projectId}: ${deletedTasks.length}`);
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

