#!/usr/bin/env tsx
/**
 * Скрипт синхронизации демо-организации acct-collabverse с БД
 * 
 * Создает организацию в БД, если она отсутствует, и синхронизирует её с памятью.
 * Это критическое исправление для устранения проблемы "организация только в памяти".
 */

import { eq, and } from 'drizzle-orm';
import { organizations, organizationMembers } from '../apps/api/src/db/schema';
import { db } from '../apps/api/src/db/config';
import { DEFAULT_ACCOUNT_ID, TEST_ADMIN_USER_ID } from '../apps/api/src/data/memory';

const ORG_ID = DEFAULT_ACCOUNT_ID; // 'acct-collabverse'
const ORG_NAME = 'Collabverse Demo Org';
const ORG_DESCRIPTION = 'Демонстрационная организация';
const OWNER_ID = TEST_ADMIN_USER_ID; // '00000000-0000-0000-0000-000000000001'

async function syncOrganizationToDb() {
  console.log('[sync-organization-to-db] Starting synchronization...');
  console.log(`[sync-organization-to-db] Organization ID: ${ORG_ID}`);
  console.log(`[sync-organization-to-db] Owner ID: ${OWNER_ID}`);

  try {
    // Проверяем, существует ли организация в БД
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ORG_ID))
      .limit(1);

    if (existingOrg) {
      console.log('[sync-organization-to-db] ✅ Organization already exists in DB');
      console.log(`[sync-organization-to-db]   Name: ${existingOrg.name}`);
      console.log(`[sync-organization-to-db]   Owner: ${existingOrg.ownerId}`);
      
      // Проверяем членство владельца
      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ORG_ID),
            eq(organizationMembers.userId, OWNER_ID)
          )
        )
        .limit(1);

      if (!existingMember) {
        console.log('[sync-organization-to-db] ⚠️  Owner membership missing, creating...');
        await db.insert(organizationMembers).values({
          organizationId: ORG_ID,
          userId: OWNER_ID,
          role: 'owner',
          status: 'active',
          isPrimary: true,
        });
        console.log('[sync-organization-to-db] ✅ Owner membership created');
      } else {
        console.log('[sync-organization-to-db] ✅ Owner membership exists');
      }

      return;
    }

    // Создаем организацию в БД
    console.log('[sync-organization-to-db] Creating organization in DB...');
    
    await db.transaction(async (tx) => {
      // Создаем организацию с фиксированным ID
      const [createdOrg] = await tx
        .insert(organizations)
        .values({
          id: ORG_ID, // Явно указываем ID для совместимости с памятью
          ownerId: OWNER_ID,
          name: ORG_NAME,
          description: ORG_DESCRIPTION,
          type: 'closed',
          isPublicInDirectory: true,
          status: 'active',
        })
        .returning();

      if (!createdOrg) {
        throw new Error('Failed to create organization');
      }

      console.log('[sync-organization-to-db] ✅ Organization created:', createdOrg.id);

      // Создаем членство владельца
      await tx.insert(organizationMembers).values({
        organizationId: ORG_ID,
        userId: OWNER_ID,
        role: 'owner',
        status: 'active',
        isPrimary: true, // Первая организация пользователя - primary
      });

      console.log('[sync-organization-to-db] ✅ Owner membership created');
    });

    console.log('[sync-organization-to-db] ✅ Synchronization completed successfully');
  } catch (error) {
    console.error('[sync-organization-to-db] ❌ Error:', error);
    if (error instanceof Error) {
      console.error('[sync-organization-to-db] Error message:', error.message);
      console.error('[sync-organization-to-db] Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Запускаем синхронизацию
syncOrganizationToDb()
  .then(() => {
    console.log('[sync-organization-to-db] Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[sync-organization-to-db] Fatal error:', error);
    process.exit(1);
  });

