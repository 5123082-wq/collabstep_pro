#!/usr/bin/env tsx
/**
 * Скрипт для очистки базы данных пользователей
 * Удаляет всех пользователей кроме admin.demo@collabverse.test
 * Переназначает все организации и проекты на admin.demo@collabverse.test
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { db } from '../apps/api/src/db/config';
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
  contracts
} from '../apps/api/src/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { TEST_ADMIN_USER_ID } from '../apps/api/src/data/memory';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

// Локальная функция хэширования пароля (копия из password.ts)
function hashPassword(password: string): string {
  const SALT_LENGTH = 32;
  const KEY_LENGTH = 64;
  const ITERATIONS = 100000;
  const DIGEST = 'sha512';
  
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  
  // Формат: salt:hash (оба в hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const ADMIN_EMAIL = 'admin.demo@collabverse.test';
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'admin.demo';

async function cleanupUsers() {
  console.log('🧹 Начинаем очистку базы данных пользователей...\n');

  try {
    // Шаг 1: Найти или создать admin.demo@collabverse.test
    console.log('📋 Шаг 1: Проверка администратора...');
    let adminUser = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
    let oldAdminId: string | null = null;

    if (adminUser.length === 0) {
      console.log('   Создаем администратора...');
      const passwordHash = hashPassword(ADMIN_PASSWORD);
      await db.insert(users).values({
        id: TEST_ADMIN_USER_ID,
        name: 'Алина Админ',
        email: ADMIN_EMAIL,
        title: 'Руководитель продукта',
        department: 'Продукт',
        location: 'Москва',
        passwordHash,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      adminUser = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
    } else {
      // Если ID не совпадает, сохраняем старый ID для переназначения
      if (adminUser[0].id !== TEST_ADMIN_USER_ID) {
        console.log('   ⚠️  ID администратора не совпадает. Будем переназначать связи...');
        oldAdminId = adminUser[0].id;
      } else {
        // ID правильный, просто обновляем данные
        const passwordHash = adminUser[0].passwordHash || hashPassword(ADMIN_PASSWORD);
        await db.update(users).set({
          name: 'Алина Админ',
          title: 'Руководитель продукта',
          department: 'Продукт',
          location: 'Москва',
          passwordHash,
          updatedAt: new Date()
        }).where(eq(users.id, TEST_ADMIN_USER_ID));
      }
    }
    
    // Обновляем данные администратора (если нужно)
    adminUser = await db.select().from(users).where(eq(users.id, TEST_ADMIN_USER_ID)).limit(1);
    if (adminUser.length > 0 && (!adminUser[0].passwordHash || adminUser[0].name !== 'Алина Админ')) {
      const passwordHash = adminUser[0].passwordHash || hashPassword(ADMIN_PASSWORD);
      await db.update(users).set({
        name: 'Алина Админ',
        title: 'Руководитель продукта',
        department: 'Продукт',
        location: 'Москва',
        passwordHash,
        updatedAt: new Date()
      }).where(eq(users.id, TEST_ADMIN_USER_ID));
    }

    console.log(`   ✅ Администратор готов: ${adminUser[0]?.id || TEST_ADMIN_USER_ID}\n`);

    // Шаг 2: Переназначить все организации на admin
    console.log('📋 Шаг 2: Переназначение организаций...');
    if (oldAdminId) {
      // Получаем данные старого пользователя
      const oldUserData = await db.select().from(users).where(eq(users.id, oldAdminId)).limit(1);
      if (oldUserData.length === 0) {
        throw new Error('Старый администратор не найден');
      }
      // Сначала создаем нового пользователя с правильным ID (временно с другим email)
      const tempEmail = `temp-${TEST_ADMIN_USER_ID}@collabverse.test`;
      const passwordHash = oldUserData[0].passwordHash || hashPassword(ADMIN_PASSWORD);
      await db.insert(users).values({
        id: TEST_ADMIN_USER_ID,
        name: 'Алина Админ',
        email: tempEmail,
        title: 'Руководитель продукта',
        department: 'Продукт',
        location: 'Москва',
        passwordHash,
        emailVerified: oldUserData[0].emailVerified || new Date(),
        createdAt: oldUserData[0].createdAt || new Date(),
        updatedAt: new Date()
      });
      // Переназначаем организации со старого ID на новый
      const orgsToUpdate = await db.select().from(organizations).where(eq(organizations.ownerId, oldAdminId));
      if (orgsToUpdate.length > 0) {
        console.log(`   Найдено организаций для переназначения: ${orgsToUpdate.length}`);
        await db.update(organizations).set({ ownerId: TEST_ADMIN_USER_ID }).where(eq(organizations.ownerId, oldAdminId));
        console.log('   ✅ Организации переназначены');
      } else {
        console.log('   ✅ Нет организаций для переназначения');
      }
      // Удаляем старого пользователя
      await db.delete(users).where(eq(users.id, oldAdminId));
      // Обновляем email нового пользователя
      await db.update(users).set({ email: ADMIN_EMAIL }).where(eq(users.id, TEST_ADMIN_USER_ID));
    }
    // Переназначаем все остальные организации
    const otherOrgs = await db.select().from(organizations).where(ne(organizations.ownerId, TEST_ADMIN_USER_ID));
    if (otherOrgs.length > 0) {
      console.log(`   Найдено других организаций для переназначения: ${otherOrgs.length}`);
      await db.update(organizations).set({ ownerId: TEST_ADMIN_USER_ID }).where(ne(organizations.ownerId, TEST_ADMIN_USER_ID));
      console.log('   ✅ Все организации переназначены');
    } else if (!oldAdminId) {
      console.log('   ✅ Нет организаций для переназначения');
    }

    // Шаг 3: Переназначить все проекты на admin
    console.log('\n📋 Шаг 3: Переназначение проектов...');
    if (oldAdminId) {
      // Переназначаем проекты со старого ID на новый
      const projectsToUpdate = await db.select().from(projects).where(eq(projects.ownerId, oldAdminId));
      if (projectsToUpdate.length > 0) {
        console.log(`   Найдено проектов для переназначения: ${projectsToUpdate.length}`);
        await db.update(projects).set({ ownerId: TEST_ADMIN_USER_ID }).where(eq(projects.ownerId, oldAdminId));
        console.log('   ✅ Проекты переназначены');
      } else {
        console.log('   ✅ Нет проектов для переназначения');
      }
    }
    // Переназначаем все остальные проекты
    const otherProjects = await db.select().from(projects).where(ne(projects.ownerId, TEST_ADMIN_USER_ID));
    if (otherProjects.length > 0) {
      console.log(`   Найдено других проектов для переназначения: ${otherProjects.length}`);
      await db.update(projects).set({ ownerId: TEST_ADMIN_USER_ID }).where(ne(projects.ownerId, TEST_ADMIN_USER_ID));
      console.log('   ✅ Все проекты переназначены');
    }

    // Шаг 4: Обновить все приглашения
    console.log('\n📋 Шаг 4: Обновление приглашений...');
    if (oldAdminId) {
      const orgInvitesOld = await db.select().from(organizationInvites).where(eq(organizationInvites.inviterId, oldAdminId));
      const projInvitesOld = await db.select().from(projectInvites).where(eq(projectInvites.inviterId, oldAdminId));
      if (orgInvitesOld.length > 0 || projInvitesOld.length > 0) {
        console.log(`   Найдено приглашений для обновления: ${orgInvitesOld.length + projInvitesOld.length}`);
        if (orgInvitesOld.length > 0) {
          await db.update(organizationInvites).set({ inviterId: TEST_ADMIN_USER_ID }).where(eq(organizationInvites.inviterId, oldAdminId));
        }
        if (projInvitesOld.length > 0) {
          await db.update(projectInvites).set({ inviterId: TEST_ADMIN_USER_ID }).where(eq(projectInvites.inviterId, oldAdminId));
        }
        console.log('   ✅ Приглашения обновлены');
      }
    }
    // Обновляем все остальные приглашения
    const orgInvitesToUpdate = await db.select().from(organizationInvites).where(ne(organizationInvites.inviterId, TEST_ADMIN_USER_ID));
    const projInvitesToUpdate = await db.select().from(projectInvites).where(ne(projectInvites.inviterId, TEST_ADMIN_USER_ID));
    if (orgInvitesToUpdate.length > 0 || projInvitesToUpdate.length > 0) {
      console.log(`   Найдено других приглашений для обновления: ${orgInvitesToUpdate.length + projInvitesToUpdate.length}`);
      if (orgInvitesToUpdate.length > 0) {
        await db.update(organizationInvites).set({ inviterId: TEST_ADMIN_USER_ID }).where(ne(organizationInvites.inviterId, TEST_ADMIN_USER_ID));
      }
      if (projInvitesToUpdate.length > 0) {
        await db.update(projectInvites).set({ inviterId: TEST_ADMIN_USER_ID }).where(ne(projectInvites.inviterId, TEST_ADMIN_USER_ID));
      }
      console.log('   ✅ Все приглашения обновлены');
    } else if (!oldAdminId) {
      console.log('   ✅ Нет приглашений для обновления');
    }

    // Шаг 5: Обновить контракты
    console.log('\n📋 Шаг 5: Обновление контрактов...');
    if (oldAdminId) {
      const contractsOld = await db.select().from(contracts).where(eq(contracts.performerId, oldAdminId));
      if (contractsOld.length > 0) {
        console.log(`   Найдено контрактов для обновления: ${contractsOld.length}`);
        await db.update(contracts).set({ performerId: TEST_ADMIN_USER_ID }).where(eq(contracts.performerId, oldAdminId));
        console.log('   ✅ Контракты обновлены');
      }
    }
    // Обновляем все остальные контракты
    const contractsToUpdate = await db.select().from(contracts).where(ne(contracts.performerId, TEST_ADMIN_USER_ID));
    if (contractsToUpdate.length > 0) {
      console.log(`   Найдено других контрактов для обновления: ${contractsToUpdate.length}`);
      await db.update(contracts).set({ performerId: TEST_ADMIN_USER_ID }).where(ne(contracts.performerId, TEST_ADMIN_USER_ID));
      console.log('   ✅ Все контракты обновлены');
    } else if (!oldAdminId) {
      console.log('   ✅ Нет контрактов для обновления');
    }

    // Шаг 6: Удалить всех пользователей кроме admin
    console.log('\n📋 Шаг 6: Удаление пользователей...');
    const allUsers = await db.select().from(users);
    const usersToDelete = allUsers.filter(u => u.id !== TEST_ADMIN_USER_ID);
    
    if (usersToDelete.length > 0) {
      console.log(`   Найдено пользователей для удаления: ${usersToDelete.length}`);
      for (const user of usersToDelete) {
        console.log(`   Удаляем: ${user.name || 'Без имени'} (${user.email || 'Нет email'})`);
        // CASCADE удалит связанные записи автоматически
        await db.delete(users).where(eq(users.id, user.id));
      }
      console.log('   ✅ Пользователи удалены');
    } else {
      console.log('   ✅ Нет пользователей для удаления');
    }
    
    // Если был старый ID, удаляем его тоже
    if (oldAdminId) {
      const oldUser = await db.select().from(users).where(eq(users.id, oldAdminId)).limit(1);
      if (oldUser.length > 0) {
        console.log(`   Удаляем старого администратора с ID: ${oldAdminId}`);
        await db.delete(users).where(eq(users.id, oldAdminId));
        console.log('   ✅ Старый администратор удален');
      }
    }

    // Шаг 7: Настроить userControls для admin
    console.log('\n📋 Шаг 7: Настройка прав администратора...');
    const adminControl = await db.select().from(userControls).where(eq(userControls.userId, TEST_ADMIN_USER_ID)).limit(1);
    
    if (adminControl.length === 0) {
      console.log('   Создаем настройки прав...');
      await db.insert(userControls).values({
        userId: TEST_ADMIN_USER_ID,
        status: 'active',
        roles: ['productAdmin', 'featureAdmin'],
        testerAccess: [],
        notes: 'Главный администратор демо-окружения',
        updatedAt: new Date(),
        updatedBy: TEST_ADMIN_USER_ID
      });
    } else {
      console.log('   Обновляем настройки прав...');
      await db.update(userControls).set({
        status: 'active',
        roles: ['productAdmin', 'featureAdmin'],
        testerAccess: [],
        notes: 'Главный администратор демо-окружения',
        updatedAt: new Date(),
        updatedBy: TEST_ADMIN_USER_ID
      }).where(eq(userControls.userId, TEST_ADMIN_USER_ID));
    }
    console.log('   ✅ Права администратора настроены');

    // Шаг 8: Финальная проверка
    console.log('\n📋 Шаг 8: Финальная проверка...');
    const finalUsers = await db.select().from(users);
    const finalAdmin = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
    
    console.log(`   Всего пользователей в базе: ${finalUsers.length}`);
    if (finalUsers.length === 1 && finalAdmin.length === 1) {
      console.log('   ✅ База данных очищена успешно');
      console.log(`   Администратор: ${finalAdmin[0].name} (${finalAdmin[0].email})`);
      console.log(`   ID: ${finalAdmin[0].id}`);
      console.log(`   Пароль установлен: ${finalAdmin[0].passwordHash ? '✅' : '❌'}`);
    } else {
      console.log('   ⚠️  В базе остались другие пользователи:');
      finalUsers.forEach(u => {
        if (u.id !== TEST_ADMIN_USER_ID) {
          console.log(`      - ${u.name} (${u.email})`);
        }
      });
    }

    console.log('\n✨ Очистка завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
    process.exit(1);
  }
}

cleanupUsers();

