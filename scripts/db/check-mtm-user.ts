import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { db } from '@collabverse/api/db/config';
import {
  users,
  organizations,
  organizationMembers,
} from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';

async function checkUserOrg(email: string) {
  try {
    console.log(`🔍 Проверка пользователя и организаций для: ${email}\n`);

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      console.log('❌ Пользователь не найден!\n');
      return;
    }

    const user = userResult[0];
    console.log(`✅ Пользователь найден: ${user.id} (${user.email})\n`);

    // 1. Проверка организаций пользователя (как владельца)
    console.log('👤 Организации пользователя (как владельца):');
    const ownedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, user.id));

    console.log(`   Владелец организаций: ${ownedOrgs.length}`);
    ownedOrgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.id}) - статус: ${org.status}`);
    });

    // 2. Проверка членства в организациях
    console.log('\n👥 Членство в организациях:');
    const memberships = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgStatus: organizations.status,
        role: organizationMembers.role,
        status: organizationMembers.status,
        isPrimary: organizationMembers.isPrimary
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, user.id));

    console.log(`   Участник организаций: ${memberships.length}`);
    memberships.forEach((m) => {
      console.log(
        `   - ${m.orgName} (${m.orgId}) - роль: ${m.role}, статус: ${m.status}, primary: ${m.isPrimary}, org статус: ${m.orgStatus}`
      );
    });

    // 3. Проверка всех членов организации МТМ Про
    if (ownedOrgs.length > 0) {
        const mtmOrg = ownedOrgs.find(o => o.name === 'МТМ Про');
        if (mtmOrg) {
            console.log(`\n👥 Все участники организации МТМ Про (${mtmOrg.id}):`);
            const mtmMembers = await db
                .select()
                .from(organizationMembers)
                .where(eq(organizationMembers.organizationId, mtmOrg.id));
            
            mtmMembers.forEach(m => {
                console.log(`   - UserID: ${m.userId}, Role: ${m.role}, Status: ${m.status}`);
            });
        }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

const email = process.argv[2] || 'mtm.tables@gmail.com';
checkUserOrg(email);
