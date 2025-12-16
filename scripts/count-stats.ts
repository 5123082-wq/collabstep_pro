import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

// Импортируем репозитории и сервисы, которые уже настроены для работы с БД
import { usersRepository, projectsRepository, adminService, memory } from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { projects } from '@collabverse/api/db/schema';
import { count } from 'drizzle-orm';

async function countStats() {
    try {
        console.log('📊 Подсчет статистики из базы данных...\n');

        // Подсчет пользователей через репозиторий (все пользователи)
        const users = await usersRepository.list();
        const totalUsers = users.length;

        // Подсчет активных пользователей через adminService (как в API)
        const adminUsers = await adminService.listUsers();
        const activeUsers = adminUsers.filter((user) => user.status === 'active').length;

        // Подсчет проектов из памяти (может быть пусто, если память не загружена)
        const projectsInMemory = memory.PROJECTS.length;
        const projectsViaRepo = projectsRepository.list().length;

        // Попытка получить проекты из БД напрямую через drizzle (новая схема - таблица project)
        let projectsFromDb = 0;
        try {
            const projectsCount = await db.select({ count: count() }).from(projects);
            projectsFromDb = projectsCount[0]?.count ?? 0;
        } catch (error) {
            // Игнорируем ошибку подключения для новой схемы
        }

        // Попытка получить проекты из старой схемы pm_projects (как в логах)
        let projectsFromPmTable = 0;
        try {
            const { sql } = await import('@vercel/postgres');
            const result = await sql.query('SELECT COUNT(*) as count FROM pm_projects');
            projectsFromPmTable = parseInt(String(result.rows[0]?.count || '0'), 10);
        } catch (error) {
            // Игнорируем ошибку, если таблица не существует или нет подключения
        }

        console.log('📈 Статистика базы данных:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👥 Всего пользователей: ${totalUsers}`);
        console.log(`✅ Активных пользователей: ${activeUsers}`);
        console.log(`📁 Проектов в памяти: ${projectsInMemory}`);
        console.log(`📁 Проектов через репозиторий: ${projectsViaRepo}`);
        if (projectsFromDb > 0) {
            console.log(`📁 Проектов в БД (таблица project): ${projectsFromDb}`);
        }
        if (projectsFromPmTable > 0) {
            console.log(`📁 Проектов в БД (таблица pm_projects): ${projectsFromPmTable}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (projectsInMemory === 0 && projectsFromDb === 0 && projectsFromPmTable === 0) {
            console.log('💡 Примечание: Проекты могут храниться в памяти при запущенном приложении.');
            console.log('   В логах видно 77 проектов в памяти, когда приложение работает.');
        }

    } catch (error) {
        console.error('❌ Ошибка при подсчете статистики:', error);
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

countStats();

