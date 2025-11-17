/**
 * Скрипт для сканирования и удаления ВСЕХ проектов и задач
 * 
 * ВНИМАНИЕ: Этот скрипт удалит все найденные проекты и задачи!
 * 
 * Запуск: npx tsx scripts/scan-and-delete-all.ts
 */

import {
  projectsRepository,
  tasksRepository,
  memory,
  financeService,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_USER_ID
} from '@collabverse/api';

// Функция для создания тестовых проектов (если их нет)
async function ensureProjectsExist() {
  const existingProjects = projectsRepository.list();
  if (existingProjects.length > 0) {
    return; // Проекты уже есть
  }
  
  console.log('📝 Создание тестовых проектов для демонстрации удаления...\n');
  
  const DEMO_USER_EMAIL = 'user.demo@collabverse.test';
  
  // Проект 1
  const project1 = projectsRepository.create({
    title: 'Проект демо пользователя',
    description: 'Проект для тестирования',
    ownerId: DEFAULT_WORKSPACE_USER_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    stage: 'build',
    type: 'product',
    visibility: 'public',
    budgetPlanned: 50000
  });
  
  tasksRepository.create({ projectId: project1.id, title: 'Задача 1', status: 'done', priority: 'high' });
  tasksRepository.create({ projectId: project1.id, title: 'Задача 2', status: 'in_progress', priority: 'high' });
  
  // Проект 2
  const project2 = projectsRepository.create({
    title: 'тест ии',
    description: 'Тестовый проект',
    ownerId: DEFAULT_WORKSPACE_USER_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    visibility: 'public'
  });
  
  // Проект 3
  const project3 = projectsRepository.create({
    title: 'Проект демо пользователя',
    description: 'Тестовый проект',
    ownerId: DEMO_USER_EMAIL,
    workspaceId: DEFAULT_WORKSPACE_ID,
    status: 'active',
    visibility: 'private'
  });
  
  tasksRepository.create({ projectId: project3.id, title: 'Задача 3', status: 'new' });
  
  console.log('✅ Тестовые проекты созданы\n');
}

async function main() {
  console.log('\n' + '═'.repeat(150));
  console.log('🔍 СКАНИРОВАНИЕ И УДАЛЕНИЕ ВСЕХ ПРОЕКТОВ И ЗАДАЧ');
  console.log('═'.repeat(150));
  console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ найденные проекты и задачи!\n');
  
  // Создаем тестовые проекты, если их нет (для демонстрации)
  await ensureProjectsExist();
  
  // Шаг 1: Сканирование
  console.log('📡 ШАГ 1: Сканирование всех проектов и задач...\n');
  
  const allProjects = projectsRepository.list();
  const allTasks = tasksRepository.list();
  
  console.log(`📊 Найдено:`);
  console.log(`   • Проектов: ${allProjects.length}`);
  console.log(`   • Задач: ${allTasks.length}\n`);
  
  if (allProjects.length === 0 && allTasks.length === 0) {
    console.log('✅ Проекты и задачи не найдены. Нечего удалять.\n');
    console.log('═'.repeat(150) + '\n');
    return;
  }
  
  // Выводим список найденных проектов
  if (allProjects.length > 0) {
    console.log('📋 Найденные проекты:');
    for (const project of allProjects) {
      const projectTasks = allTasks.filter(t => t.projectId === project.id);
      const owner = memory.WORKSPACE_USERS.find(u => u.id === project.ownerId);
      const ownerName = owner?.name || project.ownerId;
      console.log(`   • ${project.key} - ${project.title}`);
      console.log(`     Владелец: ${ownerName}`);
      console.log(`     Статус: ${project.status} | Видимость: ${project.visibility}`);
      console.log(`     Задач: ${projectTasks.length}`);
      console.log('');
    }
  }
  
  // Шаг 2: Удаление
  console.log('═'.repeat(150));
  console.log('🗑️  ШАГ 2: Удаление всех проектов и задач...\n');
  
  let deletedProjects = 0;
  let deletedTasks = 0;
  
  // Удаляем все проекты (задачи удалятся автоматически)
  for (const project of allProjects) {
    const projectTasks = allTasks.filter(t => t.projectId === project.id);
    const deleted = projectsRepository.delete(project.id);
    
    if (deleted) {
      deletedProjects++;
      deletedTasks += projectTasks.length;
      console.log(`   ✓ Удален проект: ${project.key} - ${project.title} (${projectTasks.length} задач)`);
    } else {
      console.log(`   ✗ Ошибка при удалении проекта: ${project.key} - ${project.title}`);
    }
  }
  
  // Проверяем, остались ли задачи без проектов
  const remainingTasks = tasksRepository.list();
  if (remainingTasks.length > 0) {
    console.log(`\n⚠️  Обнаружены задачи без проектов (${remainingTasks.length}). Удаляю...`);
    for (const task of remainingTasks) {
      tasksRepository.delete(task.id);
      deletedTasks++;
    }
    console.log(`   ✓ Удалено ${remainingTasks.length} задач без проектов`);
  }
  
  // Финальная проверка
  const finalProjects = projectsRepository.list();
  const finalTasks = tasksRepository.list();
  
  console.log('\n' + '═'.repeat(150));
  console.log('✅ УДАЛЕНИЕ ЗАВЕРШЕНО');
  console.log('═'.repeat(150));
  console.log(`\n📊 Результат удаления:`);
  console.log(`   • Удалено проектов: ${deletedProjects}`);
  console.log(`   • Удалено задач: ${deletedTasks}`);
  console.log(`\n📊 Финальное состояние:`);
  console.log(`   • Осталось проектов: ${finalProjects.length}`);
  console.log(`   • Осталось задач: ${finalTasks.length}\n`);
  
  if (finalProjects.length === 0 && finalTasks.length === 0) {
    console.log('✅ Все проекты и задачи успешно удалены!\n');
  } else {
    console.log('⚠️  Внимание: остались проекты или задачи, которые не были удалены.\n');
    if (finalProjects.length > 0) {
      console.log('Оставшиеся проекты:');
      for (const project of finalProjects) {
        console.log(`   • ${project.key} - ${project.title}`);
      }
    }
    if (finalTasks.length > 0) {
      console.log('Оставшиеся задачи:');
      for (const task of finalTasks) {
        console.log(`   • ${task.title} (ID: ${task.id})`);
      }
    }
  }
  
  console.log('═'.repeat(150) + '\n');
}

main().catch((error) => {
  console.error('❌ Ошибка:', error);
  process.exitCode = 1;
});

