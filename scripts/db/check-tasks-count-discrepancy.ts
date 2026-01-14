import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment from apps/web/.env.local BEFORE any imports
const envPath = path.resolve(process.cwd(), 'apps/web/.env.local');
if (existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn(`[Script] Warning: Failed to load .env.local: ${result.error.message}`);
  } else {
    console.log(`[Script] Loaded environment from: ${envPath}`);
  }
} else {
  console.warn(`[Script] Warning: .env.local not found at ${envPath}`);
}

// Fallback: also try root .env.local
const rootEnvPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(rootEnvPath) && !process.env.POSTGRES_URL) {
  const result = dotenv.config({ path: rootEnvPath });
  if (!result.error) {
    console.log(`[Script] Loaded environment from root: ${rootEnvPath}`);
  }
}

// Set POSTGRES_URL from DATABASE_URL if needed
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
  console.log('[Script] Set POSTGRES_URL from DATABASE_URL');
}

import {
  projectsRepository,
  tasksRepository,
  memory
} from '@collabverse/api';
import { fetchTasksFromPg } from '@collabverse/api/storage/pm-pg-adapter';

async function checkTasksCountDiscrepancy() {
  try {
    console.log('🔍 Проверка расхождения в подсчете задач...\n');
    console.log('═'.repeat(80));

    // 1. Подсчет задач из памяти
    const tasksInMemory = memory.TASKS.length;
    console.log(`\n📦 ИСТОЧНИК: Память (memory.TASKS)`);
    console.log(`   Всего задач: ${tasksInMemory}`);

    // 2. Подсчет задач через репозиторий (может использовать БД или память)
    const tasksViaRepo = await tasksRepository.list();
    const tasksViaRepoCount = Array.isArray(tasksViaRepo) ? tasksViaRepo.length : 0;
    console.log(`\n📦 ИСТОЧНИК: Репозиторий (tasksRepository.list())`);
    console.log(`   Всего задач: ${tasksViaRepoCount}`);

    // 3. Подсчет задач из БД напрямую
    let tasksFromDb: Array<unknown> = [];
    try {
      tasksFromDb = await fetchTasksFromPg();
      console.log(`\n📦 ИСТОЧНИК: База данных (pm_tasks через fetchTasksFromPg)`);
      console.log(`   Всего задач: ${tasksFromDb.length}`);
    } catch (error) {
      console.log(`\n📦 ИСТОЧНИК: База данных (pm_tasks)`);
      console.log(`   ❌ Ошибка при чтении из БД: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 4. Подсчет задач по проектам (как в админке)
    const allProjects = await projectsRepository.list();
    const tasksByProject = new Map<string, number>();
    const tasksByProjectDetails = new Map<string, Array<{ id: string; title: string }>>();

    for (const task of Array.isArray(tasksViaRepo) ? tasksViaRepo : []) {
      const count = tasksByProject.get(task.projectId) || 0;
      tasksByProject.set(task.projectId, count + 1);
      
      if (!tasksByProjectDetails.has(task.projectId)) {
        tasksByProjectDetails.set(task.projectId, []);
      }
      tasksByProjectDetails.get(task.projectId)!.push({ id: task.id, title: task.title });
    }

    console.log(`\n📊 ПОДСЧЕТ ПО ПРОЕКТАМ:`);
    console.log(`   Всего проектов: ${allProjects.length}`);
    let totalTasksByProjects = 0;
    for (const project of allProjects) {
      const projectTasksCount = tasksByProject.get(project.id) || 0;
      totalTasksByProjects += projectTasksCount;
      if (projectTasksCount > 0) {
        console.log(`   - ${project.key} (${project.title}): ${projectTasksCount} задач`);
      }
    }
    console.log(`   Итого задач по проектам: ${totalTasksByProjects}`);

    // 5. Подсчет задач по пользователям (как в админке)
    const projectsByOwner = new Map<string, Array<{ id: string; key: string; title: string; tasksCount: number }>>();
    
    for (const project of allProjects) {
      const owner = project.ownerId;
      if (!projectsByOwner.has(owner)) {
        projectsByOwner.set(owner, []);
      }
      const projectTasksCount = tasksByProject.get(project.id) || 0;
      projectsByOwner.get(owner)!.push({
        id: project.id,
        key: project.key,
        title: project.title,
        tasksCount: projectTasksCount
      });
    }

    console.log(`\n📊 ПОДСЧЕТ ПО ПОЛЬЗОВАТЕЛЯМ:`);
    const usersData: Array<{ userId: string; userName: string; userEmail: string; projectsCount: number; tasksCount: number }> = [];
    
    for (const [userId, projects] of projectsByOwner.entries()) {
      const user = memory.WORKSPACE_USERS.find(u => u.id === userId || u.email === userId);
      const totalTasks = projects.reduce((sum, p) => sum + p.tasksCount, 0);
      
      usersData.push({
        userId,
        userName: user?.name || userId,
        userEmail: user?.email || userId,
        projectsCount: projects.length,
        tasksCount: totalTasks
      });
    }

    usersData.sort((a, b) => b.projectsCount - a.projectsCount);
    
    for (const user of usersData) {
      if (user.tasksCount > 0) {
        console.log(`   - ${user.userName} (${user.userEmail}): ${user.projectsCount} проектов, ${user.tasksCount} задач`);
      }
    }

    const totalTasksByUsers = usersData.reduce((sum, u) => sum + u.tasksCount, 0);
    console.log(`   Итого задач по пользователям: ${totalTasksByUsers}`);

    // 6. Поиск задач без проекта (orphaned tasks)
    const allTaskIds = new Set(Array.isArray(tasksViaRepo) ? tasksViaRepo.map(t => t.id) : []);
    const allProjectIds = new Set(allProjects.map(p => p.id));
    const orphanedTasks = Array.isArray(tasksViaRepo) 
      ? tasksViaRepo.filter(t => !allProjectIds.has(t.projectId))
      : [];
    
    if (orphanedTasks.length > 0) {
      console.log(`\n⚠️  НАЙДЕНЫ ЗАДАЧИ БЕЗ ПРОЕКТА (orphaned): ${orphanedTasks.length}`);
      for (const task of orphanedTasks.slice(0, 10)) {
        console.log(`   - ${task.id}: "${task.title}" (projectId: ${task.projectId})`);
      }
      if (orphanedTasks.length > 10) {
        console.log(`   ... и еще ${orphanedTasks.length - 10} задач`);
      }
    }

    // 7. Итоговый анализ
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`\n📈 ИТОГОВАЯ СВОДКА:`);
    console.log(`   Память:                    ${tasksInMemory} задач`);
    console.log(`   Репозиторий:                ${tasksViaRepoCount} задач`);
    if (tasksFromDb > 0) {
      console.log(`   База данных:                ${tasksFromDb} задач`);
    }
    console.log(`   По проектам:                ${totalTasksByProjects} задач`);
    console.log(`   По пользователям:           ${totalTasksByUsers} задач`);
    if (orphanedTasks.length > 0) {
      console.log(`   Задач без проекта:           ${orphanedTasks.length} задач`);
    }

    // 8. Выявление расхождений
    console.log(`\n🔍 АНАЛИЗ РАСХОЖДЕНИЙ:`);
    const discrepancies: string[] = [];
    
    if (tasksInMemory !== tasksViaRepoCount) {
      discrepancies.push(`Память (${tasksInMemory}) ≠ Репозиторий (${tasksViaRepoCount})`);
    }
    
    if (tasksFromDb > 0 && tasksFromDb !== tasksViaRepoCount) {
      discrepancies.push(`БД (${tasksFromDb}) ≠ Репозиторий (${tasksViaRepoCount})`);
    }
    
    if (totalTasksByProjects !== tasksViaRepoCount) {
      discrepancies.push(`По проектам (${totalTasksByProjects}) ≠ Репозиторий (${tasksViaRepoCount})`);
    }
    
    if (totalTasksByUsers !== totalTasksByProjects) {
      discrepancies.push(`По пользователям (${totalTasksByUsers}) ≠ По проектам (${totalTasksByProjects})`);
    }

    if (discrepancies.length > 0) {
      console.log(`   ⚠️  Найдены расхождения:`);
      for (const disc of discrepancies) {
        console.log(`      - ${disc}`);
      }
    } else {
      console.log(`   ✅ Расхождений не обнаружено`);
    }

    console.log(`\n${'═'.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Ошибка при проверке расхождения:', error);
    if (error instanceof Error) {
      console.error('Детали:', error.message);
      if (error.stack) {
        console.error('\nStack trace:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkTasksCountDiscrepancy();
