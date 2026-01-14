#!/usr/bin/env tsx
/**
 * Скрипт для удаления всех пользователей с email адресами, заканчивающимися на @test.com
 * 
 * ВНИМАНИЕ: Этот скрипт удаляет пользователей и все связанные данные через CASCADE.
 * Для организаций и проектов, где пользователь является владельцем (ownerId),
 * они будут переназначены на первого найденного пользователя без @test.com,
 * или удалены, если таких пользователей нет.
 */

import dotenv from 'dotenv';
import path from 'path';
import { db } from '@collabverse/api/db/config';
import {
    users,
    accounts,
    sessions,
    userControls,
    performerProfiles,
    organizations,
    organizationMembers,
    projects,
    projectMembers,
    organizationInvites,
    projectInvites,
    contracts,
    organizationArchives,
    folders,
    files,
    attachments,
    shares,
    fileTrash,
} from '@collabverse/api/db/schema';
import { like, eq, ne, and, inArray } from 'drizzle-orm';

// Load environment from apps/web/.env.local (единственный источник)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function deleteTestUsers() {
    try {
        console.log('🗑️  Удаление пользователей с email @test.com...\n');

        // Шаг 1: Найти всех пользователей с @test.com
        console.log('📋 Шаг 1: Поиск пользователей с @test.com...');
        const testUsers = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
            })
            .from(users)
            .where(like(users.email, '%@test.com'));

        if (testUsers.length === 0) {
            console.log('   ✅ Пользователей с @test.com не найдено');
            process.exit(0);
        }

        console.log(`   Найдено пользователей для удаления: ${testUsers.length}\n`);

        // Шаг 2: Найти пользователя-замену для владельцев организаций и проектов
        console.log('📋 Шаг 2: Поиск пользователя-замены для владельцев...');
        const testUserIds = testUsers.map(u => u.id);
        const replacementUser = await db
            .select()
            .from(users)
            .where(and(
                ne(users.email, null),
                // Ищем пользователя без @test.com
                // Используем SQL для проверки, что email НЕ заканчивается на @test.com
            ))
            .limit(1);

        // Используем raw SQL для проверки, что email НЕ заканчивается на @test.com
        const { sql } = await import('drizzle-orm');
        const replacementUsers = await db
            .select()
            .from(users)
            .where(sql`${users.email} IS NOT NULL AND ${users.email} NOT LIKE '%@test.com'`)
            .limit(1);

        let replacementUserId: string | null = null;
        if (replacementUsers.length > 0) {
            replacementUserId = replacementUsers[0].id;
            console.log(`   ✅ Найден пользователь-замена: ${replacementUsers[0].email} (${replacementUserId})`);
        } else {
            console.log('   ⚠️  Пользователь-замена не найден. Организации и проекты будут удалены вместе с пользователями.');
        }

        // Шаг 3: Переназначить организации, где тестовые пользователи являются владельцами
        if (replacementUserId) {
            console.log('\n📋 Шаг 3: Переназначение организаций...');
            const orgsToReassign = await db
                .select()
                .from(organizations)
                .where(inArray(organizations.ownerId, testUserIds));

            if (orgsToReassign.length > 0) {
                console.log(`   Найдено организаций для переназначения: ${orgsToReassign.length}`);
                await db
                    .update(organizations)
                    .set({ ownerId: replacementUserId })
                    .where(inArray(organizations.ownerId, testUserIds));
                console.log('   ✅ Организации переназначены');
            } else {
                console.log('   ✅ Нет организаций для переназначения');
            }
        } else {
            console.log('\n📋 Шаг 3: Удаление организаций тестовых пользователей...');
            const orgsToDelete = await db
                .select()
                .from(organizations)
                .where(inArray(organizations.ownerId, testUserIds));

            if (orgsToDelete.length > 0) {
                console.log(`   Найдено организаций для удаления: ${orgsToDelete.length}`);
                // Удаляем через CASCADE (удаление пользователя удалит organizationMembers)
                // Но нужно удалить организации напрямую, так как ownerId имеет restrict
                for (const org of orgsToDelete) {
                    await db.delete(organizations).where(eq(organizations.id, org.id));
                }
                console.log('   ✅ Организации удалены');
            } else {
                console.log('   ✅ Нет организаций для удаления');
            }
        }

        // Шаг 4: Переназначить проекты, где тестовые пользователи являются владельцами
        if (replacementUserId) {
            console.log('\n📋 Шаг 4: Переназначение проектов...');
            const projectsToReassign = await db
                .select()
                .from(projects)
                .where(inArray(projects.ownerId, testUserIds));

            if (projectsToReassign.length > 0) {
                console.log(`   Найдено проектов для переназначения: ${projectsToReassign.length}`);
                await db
                    .update(projects)
                    .set({ ownerId: replacementUserId })
                    .where(inArray(projects.ownerId, testUserIds));
                console.log('   ✅ Проекты переназначены');
            } else {
                console.log('   ✅ Нет проектов для переназначения');
            }
        } else {
            console.log('\n📋 Шаг 4: Удаление проектов тестовых пользователей...');
            const projectsToDelete = await db
                .select()
                .from(projects)
                .where(inArray(projects.ownerId, testUserIds));

            if (projectsToDelete.length > 0) {
                console.log(`   Найдено проектов для удаления: ${projectsToDelete.length}`);
                // Удаляем через CASCADE (удаление пользователя удалит projectMembers)
                // Но нужно удалить проекты напрямую, так как ownerId имеет restrict
                for (const project of projectsToDelete) {
                    await db.delete(projects).where(eq(projects.id, project.id));
                }
                console.log('   ✅ Проекты удалены');
            } else {
                console.log('   ✅ Нет проектов для удаления');
            }
        }

        // Шаг 5: Переназначить приглашения
        if (replacementUserId) {
            console.log('\n📋 Шаг 5: Переназначение приглашений...');
            const orgInvitesToReassign = await db
                .select()
                .from(organizationInvites)
                .where(inArray(organizationInvites.inviterId, testUserIds));

            const projInvitesToReassign = await db
                .select()
                .from(projectInvites)
                .where(inArray(projectInvites.inviterId, testUserIds));

            if (orgInvitesToReassign.length > 0 || projInvitesToReassign.length > 0) {
                console.log(`   Найдено приглашений для переназначения: ${orgInvitesToReassign.length + projInvitesToReassign.length}`);
                if (orgInvitesToReassign.length > 0) {
                    await db
                        .update(organizationInvites)
                        .set({ inviterId: replacementUserId })
                        .where(inArray(organizationInvites.inviterId, testUserIds));
                }
                if (projInvitesToReassign.length > 0) {
                    await db
                        .update(projectInvites)
                        .set({ inviterId: replacementUserId })
                        .where(inArray(projectInvites.inviterId, testUserIds));
                }
                console.log('   ✅ Приглашения переназначены');
            } else {
                console.log('   ✅ Нет приглашений для переназначения');
            }
        }

        // Шаг 6: Переназначить контракты
        if (replacementUserId) {
            console.log('\n📋 Шаг 6: Переназначение контрактов...');
            const contractsToReassign = await db
                .select()
                .from(contracts)
                .where(inArray(contracts.performerId, testUserIds));

            if (contractsToReassign.length > 0) {
                console.log(`   Найдено контрактов для переназначения: ${contractsToReassign.length}`);
                await db
                    .update(contracts)
                    .set({ performerId: replacementUserId })
                    .where(inArray(contracts.performerId, testUserIds));
                console.log('   ✅ Контракты переназначены');
            } else {
                console.log('   ✅ Нет контрактов для переназначения');
            }
        }

        // Шаг 6.5: Обработка таблиц с onDelete: "restrict"
        if (replacementUserId) {
            console.log('\n📋 Шаг 6.5: Обработка таблиц с ограничениями restrict...');
            
            // organizationArchives.ownerId
            const archivesToReassign = await db
                .select()
                .from(organizationArchives)
                .where(inArray(organizationArchives.ownerId, testUserIds));
            if (archivesToReassign.length > 0) {
                console.log(`   Найдено архивов организаций для переназначения: ${archivesToReassign.length}`);
                await db
                    .update(organizationArchives)
                    .set({ ownerId: replacementUserId })
                    .where(inArray(organizationArchives.ownerId, testUserIds));
                console.log('   ✅ Архивы организаций переназначены');
            }

            // folders.createdBy
            const foldersToReassign = await db
                .select()
                .from(folders)
                .where(inArray(folders.createdBy, testUserIds));
            if (foldersToReassign.length > 0) {
                console.log(`   Найдено папок для переназначения: ${foldersToReassign.length}`);
                await db
                    .update(folders)
                    .set({ createdBy: replacementUserId })
                    .where(inArray(folders.createdBy, testUserIds));
                console.log('   ✅ Папки переназначены');
            }

            // files.uploadedBy
            const filesToReassign = await db
                .select()
                .from(files)
                .where(inArray(files.uploadedBy, testUserIds));
            if (filesToReassign.length > 0) {
                console.log(`   Найдено файлов для переназначения: ${filesToReassign.length}`);
                await db
                    .update(files)
                    .set({ uploadedBy: replacementUserId })
                    .where(inArray(files.uploadedBy, testUserIds));
                console.log('   ✅ Файлы переназначены');
            }

            // attachments.createdBy
            const attachmentsToReassign = await db
                .select()
                .from(attachments)
                .where(inArray(attachments.createdBy, testUserIds));
            if (attachmentsToReassign.length > 0) {
                console.log(`   Найдено вложений для переназначения: ${attachmentsToReassign.length}`);
                await db
                    .update(attachments)
                    .set({ createdBy: replacementUserId })
                    .where(inArray(attachments.createdBy, testUserIds));
                console.log('   ✅ Вложения переназначены');
            }

            // shares.createdBy
            const sharesToReassign = await db
                .select()
                .from(shares)
                .where(inArray(shares.createdBy, testUserIds));
            if (sharesToReassign.length > 0) {
                console.log(`   Найдено шарингов для переназначения: ${sharesToReassign.length}`);
                await db
                    .update(shares)
                    .set({ createdBy: replacementUserId })
                    .where(inArray(shares.createdBy, testUserIds));
                console.log('   ✅ Шаринги переназначены');
            }

            // fileTrash.deletedBy
            const fileTrashToReassign = await db
                .select()
                .from(fileTrash)
                .where(inArray(fileTrash.deletedBy, testUserIds));
            if (fileTrashToReassign.length > 0) {
                console.log(`   Найдено записей корзины для переназначения: ${fileTrashToReassign.length}`);
                await db
                    .update(fileTrash)
                    .set({ deletedBy: replacementUserId })
                    .where(inArray(fileTrash.deletedBy, testUserIds));
                console.log('   ✅ Записи корзины переназначены');
            }
        } else {
            // Если нет пользователя-замены, удаляем связанные записи
            console.log('\n📋 Шаг 6.5: Удаление связанных записей...');
            
            // Удаляем архивы организаций
            const archivesToDelete = await db
                .select()
                .from(organizationArchives)
                .where(inArray(organizationArchives.ownerId, testUserIds));
            if (archivesToDelete.length > 0) {
                console.log(`   Найдено архивов организаций для удаления: ${archivesToDelete.length}`);
                for (const archive of archivesToDelete) {
                    await db.delete(organizationArchives).where(eq(organizationArchives.id, archive.id));
                }
                console.log('   ✅ Архивы организаций удалены');
            }

            // Удаляем папки
            const foldersToDelete = await db
                .select()
                .from(folders)
                .where(inArray(folders.createdBy, testUserIds));
            if (foldersToDelete.length > 0) {
                console.log(`   Найдено папок для удаления: ${foldersToDelete.length}`);
                for (const folder of foldersToDelete) {
                    await db.delete(folders).where(eq(folders.id, folder.id));
                }
                console.log('   ✅ Папки удалены');
            }

            // Удаляем файлы
            const filesToDelete = await db
                .select()
                .from(files)
                .where(inArray(files.uploadedBy, testUserIds));
            if (filesToDelete.length > 0) {
                console.log(`   Найдено файлов для удаления: ${filesToDelete.length}`);
                for (const file of filesToDelete) {
                    await db.delete(files).where(eq(files.id, file.id));
                }
                console.log('   ✅ Файлы удалены');
            }

            // attachments удалятся через CASCADE при удалении files
            // shares удалятся через CASCADE при удалении files
            // fileTrash удалятся через CASCADE при удалении files
        }

        // Шаг 7: Удалить пользователей (CASCADE удалит связанные данные автоматически)
        console.log('\n📋 Шаг 7: Удаление пользователей...');
        console.log(`   Удаляем ${testUsers.length} пользователей...`);
        
        // Показываем список удаляемых пользователей
        testUsers.forEach((user, index) => {
            if (index < 10) {
                console.log(`   - ${user.email}${user.name ? ` (${user.name})` : ''}`);
            }
        });
        if (testUsers.length > 10) {
            console.log(`   ... и еще ${testUsers.length - 10} пользователей`);
        }

        // Удаляем пользователей по одному для лучшего контроля ошибок
        let deletedCount = 0;
        for (const user of testUsers) {
            try {
                // CASCADE автоматически удалит:
                // - accounts
                // - sessions
                // - userControls
                // - performerProfiles
                // - organizationMembers
                // - projectMembers
                await db.delete(users).where(eq(users.id, user.id));
                deletedCount++;
            } catch (error) {
                console.error(`   ❌ Ошибка при удалении ${user.email}:`, error instanceof Error ? error.message : String(error));
            }
        }

        console.log(`   ✅ Удалено пользователей: ${deletedCount} из ${testUsers.length}`);

        // Шаг 8: Финальная проверка
        console.log('\n📋 Шаг 8: Финальная проверка...');
        const remainingTestUsers = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(like(users.email, '%@test.com'));

        const remainingCount = Number(remainingTestUsers[0]?.count || 0);

        if (remainingCount === 0) {
            console.log('   ✅ Все пользователи с @test.com успешно удалены');
        } else {
            console.log(`   ⚠️  Осталось пользователей с @test.com: ${remainingCount}`);
        }

        console.log('\n✨ Удаление завершено!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при удалении пользователей:', error);
        if (error instanceof Error) {
            console.error('Детали:', error.message);
            if (error.stack) {
                console.error('\nStack trace:', error.stack);
            }
        }
        process.exit(1);
    }
}

deleteTestUsers();
