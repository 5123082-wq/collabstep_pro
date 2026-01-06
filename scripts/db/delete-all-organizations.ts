#!/usr/bin/env tsx
/**
 * Скрипт для удаления всех организаций из базы данных
 * Удаляет все организации (они были созданы по ошибке или для теста)
 * При удалении организаций автоматически удалятся все связанные данные:
 * - organization_members (cascade)
 * - organization_invites (cascade)
 * - projects (cascade)
 * - project_members, project_invites, tasks и другие связанные данные
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import { organizations } from '@collabverse/api/db/schema';

async function deleteAllOrganizations() {
    try {
        console.log('🔍 Поиск всех организаций в базе данных...\n');

        // Получить все организации
        const allOrganizations = await db
            .select()
            .from(organizations);

        if (allOrganizations.length === 0) {
            console.log('✅ Организаций не найдено. База данных уже чистая.');
            return;
        }

        console.log(`📂 Найдено организаций: ${allOrganizations.length}\n`);
        
        // Показать список организаций
        allOrganizations.forEach((org, index) => {
            console.log(`   ${index + 1}. ${org.name} (${org.id})`);
            console.log(`      Владелец: ${org.ownerId}`);
            console.log(`      Создано: ${org.createdAt?.toISOString() || 'N/A'}\n`);
        });

        console.log('⚠️  ВНИМАНИЕ: Удаление организаций приведет к каскадному удалению:');
        console.log('   - Всех членов организаций (organization_members)');
        console.log('   - Всех приглашений в организации (organization_invites)');
        console.log('   - Всех проектов организаций (projects)');
        console.log('   - Всех задач в проектах (tasks)');
        console.log('   - Всех других связанных данных\n');

        // Удалить все организации
        console.log('🗑️  Удаление всех организаций...\n');

        const deletedOrgs = await db
            .delete(organizations)
            .returning();

        console.log(`✅ Успешно удалено организаций: ${deletedOrgs.length}`);
        deletedOrgs.forEach((org, index) => {
            console.log(`   ${index + 1}. ${org.name} (${org.id})`);
        });

        // Проверить, что все организации удалены
        const remainingOrgs = await db
            .select()
            .from(organizations);

        if (remainingOrgs.length === 0) {
            console.log('\n✅ Все организации успешно удалены. База данных чистая.');
        } else {
            console.log(`\n⚠️  Предупреждение: Осталось организаций: ${remainingOrgs.length}`);
        }

    } catch (error) {
        console.error('❌ Ошибка при удалении организаций:', error);
        if (error instanceof Error) {
            console.error('   Сообщение:', error.message);
            if (error.stack) {
                console.error('   Stack:', error.stack);
            }
        }
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

deleteAllOrganizations();

