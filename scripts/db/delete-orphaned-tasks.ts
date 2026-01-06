/**
 * Скрипт для удаления "осиротевших" задач из БД
 * 
 * Удаляет задачи, которые ссылаются на несуществующие проекты
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { isPmDbEnabled } from '@collabverse/api/storage/pm-pg-adapter';
import { sql as vercelSql } from '@vercel/postgres';
import { projectsRepository } from '@collabverse/api';

async function deleteOrphanedTasks() {
  console.log('🗑️  Удаление "осиротевших" задач из БД...\n');

  if (!isPmDbEnabled()) {
    console.log('⚠️  БД не включена, операция невозможна');
    process.exit(1);
  }

  try {
    console.log('📡 Подключение к БД...');
    // Получаем все задачи из БД
    const tasksResult = await vercelSql.query('SELECT id, title, project_id FROM pm_tasks');
    console.log('✅ Запрос к БД выполнен');
    const tasks = tasksResult.rows || [];
    
    console.log(`📋 Найдено задач в БД: ${tasks.length}\n`);

    if (tasks.length === 0) {
      console.log('✅ Задач для проверки нет\n');
      process.exit(0);
    }

    // Получаем все существующие проекты
    const projects = await projectsRepository.list();
    const projectIds = new Set(projects.map(p => p.id));

    console.log(`📁 Найдено проектов: ${projects.length}`);
    console.log(`   ID проектов: ${Array.from(projectIds).join(', ') || '(нет проектов)'}\n`);

    // Находим "осиротевшие" задачи
    const orphanedTasks = tasks.filter((task: any) => {
      const projectId = task.project_id;
      return projectId && !projectIds.has(projectId);
    });

    console.log(`🔍 Найдено "осиротевших" задач: ${orphanedTasks.length}\n`);

    if (orphanedTasks.length === 0) {
      console.log('✅ "Осиротевших" задач не найдено\n');
      process.exit(0);
    }

    // Показываем список задач для удаления
    console.log('📋 Задачи для удаления:');
    console.log('-'.repeat(80));
    orphanedTasks.forEach((task: any, index: number) => {
      console.log(`${index + 1}. ${task.title || 'Без названия'} (${task.id.substring(0, 8)}...)`);
      console.log(`   projectId: ${task.project_id}`);
    });
    console.log('-'.repeat(80));
    console.log('');

    // Удаляем задачи
    const taskIds = orphanedTasks.map((task: any) => task.id);
    
    console.log('🗑️  Удаление задач из БД...\n');

    for (const taskId of taskIds) {
      try {
        // Удаляем комментарии задачи (если есть)
        await vercelSql.query('DELETE FROM pm_task_comments WHERE task_id = $1', [taskId]);
        
        // Удаляем саму задачу
        await vercelSql.query('DELETE FROM pm_tasks WHERE id = $1', [taskId]);
        
        console.log(`   ✅ Удалена задача: ${taskId.substring(0, 8)}...`);
      } catch (error) {
        console.error(`   ❌ Ошибка при удалении задачи ${taskId}:`, error);
      }
    }

    console.log(`\n✅ Успешно удалено задач: ${taskIds.length}`);
    console.log('');

    // Проверяем результат
    const remainingTasksResult = await vercelSql.query('SELECT COUNT(*) as count FROM pm_tasks');
    const remainingCount = parseInt(remainingTasksResult.rows[0]?.count || '0', 10);
    console.log(`📊 Осталось задач в БД: ${remainingCount}\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

deleteOrphanedTasks();

