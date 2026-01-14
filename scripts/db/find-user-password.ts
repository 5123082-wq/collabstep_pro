#!/usr/bin/env tsx
/**
 * Скрипт для поиска информации о пользователе и его пароле
 */

import dotenv from 'dotenv';
import path from 'path';
import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function findUserPassword(email: string) {
    try {
        console.log(`🔍 Поиск пользователя: ${email}\n`);

        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                passwordHash: users.passwordHash,
            })
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (!user) {
            console.log('❌ Пользователь не найден в базе данных');
            process.exit(1);
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('👤 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Имя: ${user.name || 'Не указано'}`);
        console.log(`Пароль (hash): ${user.passwordHash ? '✅ Установлен' : '❌ Не установлен'}`);
        
        if (user.passwordHash) {
            console.log(`\nХэш пароля: ${user.passwordHash}`);
            console.log('\n💡 Примечание: Пароль хранится в виде хэша.');
            console.log('   Если вам нужен исходный пароль, проверьте:');
            console.log('   - Скрипты инициализации базы данных');
            console.log('   - Документацию или конфигурационные файлы');
            console.log('   - Переменные окружения (DEMO_*_PASSWORD)');
        } else {
            console.log('\n⚠️  Пароль не установлен. Пользователь может использовать OAuth для входа.');
        }

        console.log('═══════════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при поиске пользователя:', error);
        if (error instanceof Error) {
            console.error('Детали:', error.message);
            if (error.stack) {
                console.error('\nStack trace:', error.stack);
            }
        }
        process.exit(1);
    }
}

// Получаем email из аргументов командной строки
const email = process.argv[2] || 'viewer@example.com';

findUserPassword(email);
