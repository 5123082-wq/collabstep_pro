#!/usr/bin/env tsx
/**
 * Скрипт для подсчета пользователей с email адресами, заканчивающимися на @test.com
 */

import dotenv from 'dotenv';
import path from 'path';
import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { like, count } from 'drizzle-orm';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function countTestUsers() {
    try {
        console.log('🔍 Подсчет пользователей с email, заканчивающимся на @test.com...\n');

        // Подсчет пользователей с email, заканчивающимся на @test.com
        const result = await db
            .select({ count: count() })
            .from(users)
            .where(like(users.email, '%@test.com'));

        const testUsersCount = result[0]?.count ?? 0;

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`👥 Пользователей с email @test.com: ${testUsersCount}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        // Дополнительно: показываем список этих пользователей
        if (testUsersCount > 0) {
            const testUsers = await db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                })
                .from(users)
                .where(like(users.email, '%@test.com'))
                .limit(50); // Ограничиваем вывод до 50 пользователей

            console.log('📋 Список пользователей (первые 50):');
            console.log('───────────────────────────────────────────────────────');
            testUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email}${user.name ? ` (${user.name})` : ''} [${user.id}]`);
            });
            if (testUsersCount > 50) {
                console.log(`\n... и еще ${testUsersCount - 50} пользователей`);
            }
            console.log('');
        }

    } catch (error) {
        console.error('❌ Ошибка при подсчете пользователей:', error);
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

countTestUsers();
