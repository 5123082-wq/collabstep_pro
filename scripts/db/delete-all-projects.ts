/**
 * Скрипт для удаления ВСЕХ проектов и задач из системы
 * 
 * ВНИМАНИЕ: Этот скрипт удалит все проекты и связанные с ними задачи!
 * 
 * Запуск: npx tsx scripts/delete-all-projects.ts
 */

import {
  projectsRepository,
  tasksRepository,
  memory
} from '@collabverse/api';

async function main() {
  console.log('\n' + '═'.repeat(150));
  console.log('🗑️  УДАЛЕНИЕ ВСЕХ ПРОЕКТОВ И ЗАДАЧ');
  console.log('═'.repeat(150));
  console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ проекты и задачи из системы!\n');
  
  // Получаем все проекты
  const allProjects = projectsRepository.list();
  const allTasks = tasksRepository.list();
  
  console.log(`📊 Текущее состояние:`);
  console.log(`   • Проектов: ${allProjects.length}`);
  console.log(`   • Задач: ${allTasks.length}\n`);
  
  if (allProjects.length === 0 && allTasks.length === 0) {
    console.log('✅ Проекты и задачи не найдены. Нечего удалять.\n');
    return;
  }
  
  // Выводим список проектов, которые будут удалены
  if (allProjects.length > 0) {
    console.log('📋 Проекты, которые будут удалены:');
    for (const project of allProjects) {
      const projectTasks = allTasks.filter(t => t.projectId === project.id);
      console.log(`   • ${project.key} - ${project.title} (${projectTasks.length} задач)`);
    }
    console.log('');
  }
  
  // Удаляем все проекты (задачи удалятся автоматически)
  let deletedProjects = 0;
  let deletedTasks = 0;
  
  console.log('🗑️  Начинаю удаление...\n');
  
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
  
  // Проверяем, остались ли задачи без проектов (на всякий случай)
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
  console.log(`\n📊 Результат:`);
  console.log(`   • Удалено проектов: ${deletedProjects}`);
  console.log(`   • Удалено задач: ${deletedTasks}`);
  console.log(`\n📊 Текущее состояние:`);
  console.log(`   • Осталось проектов: ${finalProjects.length}`);
  console.log(`   • Осталось задач: ${finalTasks.length}\n`);
  
  if (finalProjects.length === 0 && finalTasks.length === 0) {
    console.log('✅ Все проекты и задачи успешно удалены!\n');
  } else {
    console.log('⚠️  Внимание: остались проекты или задачи, которые не были удалены.\n');
  }
  
  console.log('═'.repeat(150) + '\n');
}

main().catch((error) => {
  console.error('❌ Ошибка при удалении:', error);
  process.exitCode = 1;
});

