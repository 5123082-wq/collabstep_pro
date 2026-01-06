/**
 * Скрипт проверки синхронизации БД ↔ память
 * 
 * Проверяет, что данные в БД и памяти синхронизированы для:
 * - Организаций
 * - Проектов (pm_projects)
 * - Задач (pm_tasks)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import {
  projectsRepository,
  tasksRepository,
  organizationsRepository,
  memory
} from '@collabverse/api';
import { isPmDbEnabled } from '@collabverse/api/storage/pm-pg-adapter';
import { sql as vercelSql } from '@vercel/postgres';

interface SyncIssue {
  type: 'organization' | 'project' | 'task';
  id: string;
  name: string;
  issue: 'missing_in_db' | 'missing_in_memory' | 'count_mismatch';
  details: string;
}

const issues: SyncIssue[] = [];

async function verifyOrganizationsSync(): Promise<void> {
  console.log('\n📂 Проверка синхронизации организаций...\n');

  if (!isPmDbEnabled()) {
    console.log('⚠️  БД не включена, пропускаем проверку');
    return;
  }

  try {
    // Получаем организации из БД
    const dbOrgsResult = await vercelSql.query('SELECT * FROM organization');
    const dbOrgs = dbOrgsResult.rows || [];
    const dbOrgIds = new Set(dbOrgs.map((org: any) => org.id));

    // Получаем организации из памяти
    const memoryOrgs = memory.ORGANIZATIONS || [];
    const memoryOrgIds = new Set(memoryOrgs.map((org) => org.id));

    // Проверяем организации только в БД
    for (const dbOrg of dbOrgs) {
      if (!memoryOrgIds.has(dbOrg.id)) {
        issues.push({
          type: 'organization',
          id: dbOrg.id,
          name: dbOrg.name || 'N/A',
          issue: 'missing_in_memory',
          details: `Организация существует в БД, но отсутствует в памяти`
        });
      }
    }

    // Проверяем организации только в памяти
    for (const memoryOrg of memoryOrgs) {
      if (!dbOrgIds.has(memoryOrg.id)) {
        issues.push({
          type: 'organization',
          id: memoryOrg.id,
          name: memoryOrg.name || 'N/A',
          issue: 'missing_in_db',
          details: `Организация существует в памяти, но отсутствует в БД`
        });
      }
    }

    console.log(`   БД: ${dbOrgs.length} организаций`);
    console.log(`   Память: ${memoryOrgs.length} организаций`);
    console.log(`   Синхронизировано: ${Math.min(dbOrgs.length, memoryOrgs.length)}`);
  } catch (error) {
    console.error('   ❌ Ошибка при проверке организаций:', error);
  }
}

async function verifyProjectsSync(): Promise<void> {
  console.log('\n📁 Проверка синхронизации проектов...\n');

  if (!isPmDbEnabled()) {
    console.log('⚠️  БД не включена, пропускаем проверку');
    return;
  }

  try {
    // Получаем проекты из БД (pm_projects)
    const dbProjectsResult = await vercelSql.query('SELECT * FROM pm_projects');
    const dbProjects = dbProjectsResult.rows || [];
    const dbProjectIds = new Set(dbProjects.map((p: any) => p.id));

    // Получаем проекты из памяти
    const memoryProjects = memory.PROJECTS || [];
    const memoryProjectIds = new Set(memoryProjects.map((p) => p.id));

    // Проверяем проекты только в БД
    for (const dbProject of dbProjects) {
      if (!memoryProjectIds.has(dbProject.id)) {
        issues.push({
          type: 'project',
          id: dbProject.id,
          name: dbProject.title || dbProject.name || 'N/A',
          issue: 'missing_in_memory',
          details: `Проект существует в БД (pm_projects), но отсутствует в памяти`
        });
      }
    }

    // Проверяем проекты только в памяти
    for (const memoryProject of memoryProjects) {
      if (!dbProjectIds.has(memoryProject.id)) {
        issues.push({
          type: 'project',
          id: memoryProject.id,
          name: memoryProject.title || 'N/A',
          issue: 'missing_in_db',
          details: `Проект существует в памяти, но отсутствует в БД (pm_projects)`
        });
      }
    }

    console.log(`   БД (pm_projects): ${dbProjects.length} проектов`);
    console.log(`   Память: ${memoryProjects.length} проектов`);
    console.log(`   Синхронизировано: ${Math.min(dbProjects.length, memoryProjects.length)}`);
  } catch (error) {
    console.error('   ❌ Ошибка при проверке проектов:', error);
  }
}

async function verifyTasksSync(): Promise<void> {
  console.log('\n📋 Проверка синхронизации задач...\n');

  if (!isPmDbEnabled()) {
    console.log('⚠️  БД не включена, пропускаем проверку');
    return;
  }

  try {
    // Получаем задачи из БД (pm_tasks)
    const dbTasksResult = await vercelSql.query('SELECT * FROM pm_tasks');
    const dbTasks = dbTasksResult.rows || [];
    const dbTaskIds = new Set(dbTasks.map((t: any) => t.id));

    // Получаем задачи из памяти
    const memoryTasks = memory.TASKS || [];
    const memoryTaskIds = new Set(memoryTasks.map((t) => t.id));

    // Проверяем задачи только в БД
    for (const dbTask of dbTasks) {
      if (!memoryTaskIds.has(dbTask.id)) {
        issues.push({
          type: 'task',
          id: dbTask.id,
          name: dbTask.title || 'N/A',
          issue: 'missing_in_memory',
          details: `Задача существует в БД (pm_tasks), но отсутствует в памяти`
        });
      }
    }

    // Проверяем задачи только в памяти
    for (const memoryTask of memoryTasks) {
      if (!dbTaskIds.has(memoryTask.id)) {
        issues.push({
          type: 'task',
          id: memoryTask.id,
          name: memoryTask.title || 'N/A',
          issue: 'missing_in_db',
          details: `Задача существует в памяти, но отсутствует в БД (pm_tasks)`
        });
      }
    }

    console.log(`   БД (pm_tasks): ${dbTasks.length} задач`);
    console.log(`   Память: ${memoryTasks.length} задач`);
    console.log(`   Синхронизировано: ${Math.min(dbTasks.length, memoryTasks.length)}`);
  } catch (error) {
    console.error('   ❌ Ошибка при проверке задач:', error);
  }
}

async function main() {
  console.log('🔍 Проверка синхронизации БД ↔ память\n');
  console.log('='.repeat(60));

  await verifyOrganizationsSync();
  await verifyProjectsSync();
  await verifyTasksSync();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ\n');

  if (issues.length === 0) {
    console.log('✅ Синхронизация в порядке: все данные совпадают между БД и памятью\n');
    process.exit(0);
  } else {
    console.log(`⚠️  Найдено проблем синхронизации: ${issues.length}\n`);

    // Группируем по типу
    const byType = {
      organization: issues.filter((i) => i.type === 'organization'),
      project: issues.filter((i) => i.type === 'project'),
      task: issues.filter((i) => i.type === 'task')
    };

    if (byType.organization.length > 0) {
      console.log('📂 ОРГАНИЗАЦИИ:');
      byType.organization.forEach((issue) => {
        console.log(`   - ${issue.name} (${issue.id.substring(0, 8)}...): ${issue.details}`);
      });
      console.log('');
    }

    if (byType.project.length > 0) {
      console.log('📁 ПРОЕКТЫ:');
      byType.project.slice(0, 10).forEach((issue) => {
        console.log(`   - ${issue.name} (${issue.id.substring(0, 8)}...): ${issue.details}`);
      });
      if (byType.project.length > 10) {
        console.log(`   ... и еще ${byType.project.length - 10} проектов`);
      }
      console.log('');
    }

    if (byType.task.length > 0) {
      console.log('📋 ЗАДАЧИ:');
      byType.task.slice(0, 10).forEach((issue) => {
        console.log(`   - ${issue.name} (${issue.id.substring(0, 8)}...): ${issue.details}`);
      });
      if (byType.task.length > 10) {
        console.log(`   ... и еще ${byType.task.length - 10} задач`);
      }
      console.log('');
    }

    console.log('💡 Рекомендации:');
    console.log('   - Запустите comprehensive-data-audit.ts для детального анализа');
    console.log('   - Проверьте логи репозиториев на ошибки синхронизации');
    console.log('   - Убедитесь, что БД включена (USE_DB_STORAGE !== false)\n');

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

