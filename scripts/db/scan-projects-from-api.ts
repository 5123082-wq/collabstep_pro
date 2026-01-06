/**
 * Скрипт для сканирования всех проектов через API
 * Используйте этот скрипт, когда сервер Next.js запущен
 * 
 * Запуск: npx tsx scripts/scan-projects-from-api.ts
 */

import { memory } from '@collabverse/api';

// Функция для создания демо-сессии
function createDemoSession(email: string, role: 'admin' | 'user' = 'admin'): string {
  const session = {
    email,
    role,
    issuedAt: Date.now()
  };
  return Buffer.from(JSON.stringify(session)).toString('base64url');
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminEmail = 'admin.demo@collabverse.test';
  const sessionToken = createDemoSession(adminEmail, 'admin');
  
  console.log('🔍 Запрос данных через API...\n');
  console.log(`   URL: ${baseUrl}/api/dev/check-projects`);
  console.log(`   Пользователь: ${adminEmail}\n`);
  
  try {
    const response = await fetch(`${baseUrl}/api/dev/check-projects`, {
      headers: {
        'Cookie': `demo-session=${sessionToken}`
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Ошибка API: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`   Ответ: ${text.substring(0, 200)}`);
      return;
    }
    
    const result = await response.json();
    const data = result.data || result;
    const projects = data.projects || [];
    const tasks = data.tasks || [];
    
    console.log('═'.repeat(150));
    console.log('📊 ПОДРОБНЫЙ ОТЧЕТ: ВСЕ ПРОЕКТЫ И ЗАДАЧИ В СИСТЕМЕ (из API)');
    console.log('═'.repeat(150));
    console.log(`\n📈 СВОДКА:`);
    console.log(`   • Всего проектов: ${projects.length}`);
    console.log(`   • Всего задач: ${tasks.length}\n`);
    
    if (projects.length === 0) {
      console.log('⚠️  Проектов не найдено в памяти сервера.\n');
      console.log('   Возможные причины:');
      console.log('   1. Сервер был перезапущен (память очищена)');
      console.log('   2. Проекты еще не были созданы');
      console.log('   3. Проекты находятся в другом workspace\n');
      return;
    }
    
    // Создаем мапу пользователей
    const usersMap = new Map(memory.WORKSPACE_USERS.map(user => [user.id, user]));
    
    // Группируем проекты по владельцам
    const ownersMap = new Map<string, any[]>();
    for (const project of projects) {
      const ownerId = project.ownerId;
      if (!ownersMap.has(ownerId)) {
        ownersMap.set(ownerId, []);
      }
      ownersMap.get(ownerId)!.push(project);
    }
    
    console.log('═'.repeat(150));
    console.log('👥 ВЛАДЕЛЬЦЫ И ИХ ПРОЕКТЫ');
    console.log('═'.repeat(150));
    
    for (const [ownerId, ownerProjects] of Array.from(ownersMap.entries()).sort()) {
      const owner = usersMap.get(ownerId);
      const ownerName = owner?.name || ownerId;
      const ownerEmail = owner?.email || ownerId;
      const ownerTasks = tasks.filter((t: any) => ownerProjects.some((p: any) => p.id === t.projectId));
      
      console.log(`\n👤 ВЛАДЕЛЕЦ: ${ownerName}`);
      console.log(`   📧 Email: ${ownerEmail}`);
      console.log(`   📊 Статистика: ${ownerProjects.length} проектов, ${ownerTasks.length} задач`);
      console.log('─'.repeat(150));
      
      for (const project of ownerProjects) {
        const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
        
        console.log(`\n  📁 ПРОЕКТ: ${project.key || 'N/A'} - ${project.title}`);
        console.log(`     🆔 ID: ${project.id}`);
        console.log(`     📍 Статус: ${project.status} | Видимость: ${project.visibility} | Архив: ${project.archived ? 'ДА' : 'НЕТ'}`);
        console.log(`     📊 Задач: ${projectTasks.length}`);
        console.log(`     🏢 Workspace: ${project.workspaceId}`);
        
        if (projectTasks.length > 0) {
          console.log(`     \n     ✅ ЗАДАЧИ (${projectTasks.length}):`);
          for (const task of projectTasks) {
            console.log(`       • #${task.number} ${task.title} [${task.status}]`);
          }
        } else {
          console.log(`     ⚠️  Задач нет`);
        }
      }
    }
    
    console.log('\n' + '═'.repeat(150));
    console.log('📋 СВОДНАЯ ТАБЛИЦА ВСЕХ ПРОЕКТОВ');
    console.log('═'.repeat(150));
    
    const headers = ['Владелец', 'Ключ', 'Название', 'Статус', 'Видимость', 'Задач', 'ID'];
    const colWidths = [25, 12, 35, 12, 12, 8, 40];
    
    function printRow(values: string[]) {
      let row = '|';
      values.forEach((val, i) => {
        row += ` ${val.padEnd(colWidths[i])} |`;
      });
      console.log(row);
    }
    
    printRow(headers);
    console.log('|' + colWidths.map(w => '─'.repeat(w + 2)).join('|') + '|');
    
    for (const project of projects) {
      const owner = usersMap.get(project.ownerId);
      const ownerName = (owner?.name || project.ownerId).substring(0, colWidths[0]);
      const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
      
      printRow([
        ownerName,
        (project.key || 'N/A').substring(0, colWidths[1]),
        project.title.substring(0, colWidths[2]),
        project.status.substring(0, colWidths[3]),
        project.visibility.substring(0, colWidths[4]),
        projectTasks.length.toString(),
        project.id.substring(0, colWidths[6])
      ]);
    }
    
    console.log('═'.repeat(150));
    
    // Проверяем наличие конкретного проекта
    const targetProjectId = '3ed04ee2-c56e-4016-b2f3-15af90019469';
    const targetProject = projects.find((p: any) => p.id === targetProjectId);
    
    if (targetProject) {
      console.log(`\n✅ НАЙДЕН ПРОЕКТ: ${targetProject.key} - ${targetProject.title}`);
      console.log(`   ID: ${targetProject.id}`);
      console.log(`   Статус: ${targetProject.status}`);
      console.log(`   Видимость: ${targetProject.visibility}`);
    } else {
      console.log(`\n⚠️  Проект с ID ${targetProjectId} не найден в текущей памяти сервера.`);
      console.log(`   Возможно, сервер был перезапущен или проект был удален.`);
    }
    
    console.log('\n' + '═'.repeat(150));
    console.log('✅ Отчет завершен');
    console.log('═'.repeat(150) + '\n');
    
  } catch (error: any) {
    console.error('❌ Ошибка при запросе к API:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Сервер Next.js запущен (npm run dev)');
    console.error('   2. Сервер доступен по адресу', baseUrl);
    console.error('   3. API endpoint /api/dev/check-projects доступен\n');
  }
}

main().catch((error) => {
  console.error('Ошибка:', error);
  process.exitCode = 1;
});

