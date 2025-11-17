/**
 * Скрипт для удаления проектов через API (из памяти запущенного сервера)
 * 
 * Этот скрипт удаляет проекты из памяти запущенного сервера Next.js через API
 * 
 * Запуск: npx tsx scripts/delete-projects-via-api.ts
 */

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
  
  console.log('\n' + '═'.repeat(150));
  console.log('🗑️  УДАЛЕНИЕ ПРОЕКТОВ ИЗ ПАМЯТИ СЕРВЕРА ЧЕРЕЗ API');
  console.log('═'.repeat(150));
  console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт удалит проекты из памяти запущенного сервера!\n');
  
  try {
    // Шаг 1: Получаем список проектов через API
    console.log('📡 ШАГ 1: Получение списка проектов через API...\n');
    
    const response = await fetch(`${baseUrl}/api/dev/check-projects`, {
      headers: {
        'Cookie': `cv_session=${sessionToken}`
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Ошибка при получении списка проектов: ${response.status}`);
      return;
    }
    
    const result = await response.json();
    const data = result.data || result;
    const projects = data.projects || [];
    const tasks = data.tasks || [];
    
    console.log(`📊 Найдено в памяти сервера:`);
    console.log(`   • Проектов: ${projects.length}`);
    console.log(`   • Задач: ${tasks.length}\n`);
    
    if (projects.length === 0) {
      console.log('✅ Проектов не найдено. Нечего удалять.\n');
      return;
    }
    
    // Выводим список проектов
    console.log('📋 Проекты в памяти сервера:');
    for (const project of projects) {
      const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
      console.log(`   • ${project.key} - ${project.title}`);
      console.log(`     ID: ${project.id}`);
      console.log(`     Статус: ${project.status} | Задач: ${projectTasks.length}`);
      console.log('');
    }
    
    // Шаг 2: Удаляем проекты через API
    console.log('═'.repeat(150));
    console.log('🗑️  ШАГ 2: Удаление проектов через API...\n');
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const project of projects) {
      try {
        const deleteResponse = await fetch(`${baseUrl}/api/pm/projects/${project.id}`, {
          method: 'DELETE',
          headers: {
            'Cookie': `cv_session=${sessionToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          deletedCount++;
          console.log(`   ✓ Удален: ${project.key} - ${project.title}`);
        } else {
          errorCount++;
          const errorText = await deleteResponse.text();
          console.log(`   ✗ Ошибка при удалении ${project.key}: ${deleteResponse.status}`);
          console.log(`     Детали: ${errorText.substring(0, 200)}`);
        }
      } catch (error: any) {
        errorCount++;
        console.log(`   ✗ Ошибка при удалении ${project.key}: ${error.message}`);
      }
    }
    
    // Финальная проверка
    console.log('\n' + '═'.repeat(150));
    console.log('📊 Проверка результата...\n');
    
    const checkResponse = await fetch(`${baseUrl}/api/dev/check-projects`, {
      headers: {
        'Cookie': `cv_session=${sessionToken}`
      }
    });
    
    if (checkResponse.ok) {
      const checkResult = await checkResponse.json();
      const checkData = checkResult.data || checkResult;
      const remainingProjects = checkData.projects || [];
      
      console.log('═'.repeat(150));
      console.log('✅ РЕЗУЛЬТАТ УДАЛЕНИЯ');
      console.log('═'.repeat(150));
      console.log(`\n📊 Статистика:`);
      console.log(`   • Успешно удалено: ${deletedCount}`);
      console.log(`   • Ошибок при удалении: ${errorCount}`);
      console.log(`   • Осталось проектов: ${remainingProjects.length}\n`);
      
      if (remainingProjects.length === 0) {
        console.log('✅ Все проекты успешно удалены из памяти сервера!\n');
      } else {
        console.log('⚠️  Некоторые проекты остались:\n');
        for (const project of remainingProjects) {
          console.log(`   • ${project.key} - ${project.title} (ID: ${project.id})`);
        }
        console.log('');
      }
    }
    
    console.log('═'.repeat(150) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Ошибка при работе с API:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Убедитесь, что:');
    console.error('   1. Сервер Next.js запущен (npm run dev)');
    console.error('   2. Сервер доступен по адресу', baseUrl);
    console.error('   3. API endpoints доступны\n');
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exitCode = 1;
});

