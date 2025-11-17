/**
 * Улучшенный скрипт для удаления ВСЕХ проектов и задач через API
 * 
 * Этот скрипт работает с запущенным сервером Next.js и использует
 * новые API endpoints для надежного удаления всех данных
 * 
 * Запуск: npx tsx scripts/clear-all-data.ts
 */

// Функция для создания демо-сессии администратора
function createAdminSession(email: string = 'admin.demo@collabverse.test'): string {
  const session = {
    email,
    role: 'admin',
    issuedAt: Date.now()
  };
  return Buffer.from(JSON.stringify(session)).toString('base64url');
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const sessionToken = createAdminSession();
  
  console.log('\n' + '═'.repeat(80));
  console.log('🗑️  УДАЛЕНИЕ ВСЕХ ДАННЫХ ЧЕРЕЗ API');
  console.log('═'.repeat(80));
  console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ проекты и задачи!\n');
  
  try {
    // Шаг 1: Получаем статистику ДО удаления
    console.log('📊 ШАГ 1: Получение текущей статистики...\n');
    
    const statsResponse = await fetch(`${baseUrl}/api/admin/data/stats`, {
      headers: {
        'Cookie': `cv_session=${sessionToken}`
      }
    });
    
    if (!statsResponse.ok) {
      console.error(`❌ Ошибка при получении статистики: ${statsResponse.status}`);
      if (statsResponse.status === 401) {
        console.error('   Требуется авторизация администратора');
      } else if (statsResponse.status === 403) {
        console.error('   Недостаточно прав доступа');
      }
      return;
    }
    
    const statsData = await statsResponse.json();
    
    console.log('📈 Текущее состояние:');
    console.log(`   • Всего проектов: ${statsData.summary.totalProjects}`);
    console.log(`   • Всего задач: ${statsData.summary.totalTasks}`);
    console.log(`   • Пользователей с данными: ${statsData.summary.totalUsers}\n`);
    
    if (statsData.summary.totalProjects === 0 && statsData.summary.totalTasks === 0) {
      console.log('✅ Нет данных для удаления. База уже пуста.\n');
      console.log('═'.repeat(80) + '\n');
      return;
    }
    
    // Показываем детальную информацию по пользователям
    if (statsData.users && statsData.users.length > 0) {
      console.log('📋 Данные по пользователям:');
      for (const user of statsData.users) {
        console.log(`   • ${user.userName} (${user.userEmail})`);
        console.log(`     Проектов: ${user.projectsCount}, Задач: ${user.tasksCount}`);
      }
      console.log('');
    }
    
    // Шаг 2: Удаляем все данные
    console.log('═'.repeat(80));
    console.log('🗑️  ШАГ 2: Удаление всех данных...\n');
    
    const clearResponse = await fetch(`${baseUrl}/api/admin/data/clear`, {
      method: 'POST',
      headers: {
        'Cookie': `cv_session=${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: true })
    });
    
    if (!clearResponse.ok) {
      const errorText = await clearResponse.text();
      console.error(`❌ Ошибка при удалении данных: ${clearResponse.status}`);
      console.error(`   Детали: ${errorText.substring(0, 200)}`);
      return;
    }
    
    const clearResult = await clearResponse.json();
    
    console.log('✅ Удаление завершено:');
    console.log(`   • Удалено проектов: ${clearResult.deleted.projects}`);
    console.log(`   • Удалено задач: ${clearResult.deleted.tasks}\n`);
    
    // Шаг 3: Проверяем результат
    console.log('═'.repeat(80));
    console.log('📊 ШАГ 3: Проверка результата...\n');
    
    const finalStatsResponse = await fetch(`${baseUrl}/api/admin/data/stats`, {
      headers: {
        'Cookie': `cv_session=${sessionToken}`
      }
    });
    
    if (finalStatsResponse.ok) {
      const finalStats = await finalStatsResponse.json();
      
      console.log('📈 Финальное состояние:');
      console.log(`   • Осталось проектов: ${finalStats.summary.totalProjects}`);
      console.log(`   • Осталось задач: ${finalStats.summary.totalTasks}`);
      console.log(`   • Пользователей с данными: ${finalStats.summary.totalUsers}\n`);
      
      if (finalStats.summary.totalProjects === 0 && finalStats.summary.totalTasks === 0) {
        console.log('✅ Все данные успешно удалены!\n');
      } else {
        console.log('⚠️  Внимание: остались данные, которые не были удалены:\n');
        if (finalStats.users && finalStats.users.length > 0) {
          for (const user of finalStats.users) {
            console.log(`   • ${user.userName}: ${user.projectsCount} проектов, ${user.tasksCount} задач`);
          }
        }
        console.log('');
      }
    }
    
    console.log('═'.repeat(80) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Ошибка при работе с API:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Убедитесь, что:');
    console.error('   1. Сервер Next.js запущен (npm run dev или pnpm dev)');
    console.error('   2. Сервер доступен по адресу', baseUrl);
    console.error('   3. API endpoints доступны');
    console.error('   4. У вас есть права администратора\n');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exitCode = 1;
});

