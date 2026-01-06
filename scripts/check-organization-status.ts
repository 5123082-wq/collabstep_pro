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
  projects as projectsTable
} from '@collabverse/api/db/schema';
import { eq, sql } from 'drizzle-orm';

async function checkOrganizationStatus() {
  try {
    console.log('🔍 Проверка статуса организаций...\n');

    const adminEmail = 'admin.demo@collabverse.test';
    console.log(`📧 Проверка пользователя: ${adminEmail}`);
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (adminUser.length === 0) {
      console.log('❌ Пользователь не найден!\n');
      return;
    }

    const user = adminUser[0];
    console.log(`✅ Пользователь найден: ${user.id} (${user.email})\n`);

    // 1. Проверка всех организаций в БД
    console.log('📂 Все организации в БД:');
    const allOrgs = await db.select().from(organizations);
    console.log(`   Всего организаций: ${allOrgs.length}`);
    allOrgs.forEach((org) => {
      console.log(
        `   - ${org.name} (${org.id}) - статус: ${org.status} - владелец: ${org.ownerId}`
      );
    });

    // 2. Проверка организаций пользователя (как владельца)
    console.log('\n👤 Организации пользователя (как владельца):');
    const ownedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, user.id));

    console.log(`   Владелец организаций: ${ownedOrgs.length}`);
    ownedOrgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.id}) - статус: ${org.status}`);
    });

    // 3. Проверка членства в организациях
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

    // 4. Проверка проектов пользователя
    console.log('\n📁 Проекты пользователя:');
    const userProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, user.id));

    console.log(`   Всего проектов: ${userProjects.length}`);

    // Группировка по организациям
    const projectsByOrg = new Map<string, number>();
    const projectsWithoutOrg: typeof userProjects = [];

    userProjects.forEach((p) => {
      if (p.organizationId) {
        projectsByOrg.set(p.organizationId, (projectsByOrg.get(p.organizationId) || 0) + 1);
      } else {
        projectsWithoutOrg.push(p);
      }
    });

    console.log(`   Проектов с организациями: ${userProjects.length - projectsWithoutOrg.length}`);
    console.log(`   Проектов без организаций: ${projectsWithoutOrg.length}`);

    if (projectsByOrg.size > 0) {
      console.log('\n   Проекты по организациям:');
      for (const [orgId, count] of projectsByOrg.entries()) {
        const org = allOrgs.find((o) => o.id === orgId);
        const orgName = org ? org.name : `[УДАЛЕНА: ${orgId}]`;
        console.log(`   - ${orgName}: ${count} проектов`);
      }
    }

    if (projectsWithoutOrg.length > 0) {
      console.log('\n   ⚠️  Проекты без организаций:');
      projectsWithoutOrg.slice(0, 10).forEach((p) => {
        console.log(`   - ${p.name} (${p.id})`);
      });
      if (projectsWithoutOrg.length > 10) {
        console.log(`   ... и еще ${projectsWithoutOrg.length - 10} проектов`);
      }
    }

    // 5. Проверка архивных/удаленных организаций
    console.log('\n🗄️  Архивные/удаленные организации:');
    const archivedOrgs = allOrgs.filter(
      (org) => org.status === 'archived' || org.status === 'deleted'
    );
    console.log(`   Архивных/удаленных: ${archivedOrgs.length}`);
    archivedOrgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.id}) - статус: ${org.status}`);
    });

    // 6. Резюме
    console.log('\n📋 РЕЗЮМЕ:');
    if (ownedOrgs.length === 0 && memberships.length === 0) {
      console.log('❌ КРИТИЧНО: Пользователь не имеет ни одной организации!');
      console.log('   Возможные причины:');
      console.log('   1. Организация была удалена через organization-closure-service');
      console.log('   2. Произошло каскадное удаление из-за ошибки в БД');
      console.log('   3. Организация была удалена вручную');
    } else if (memberships.length > 0) {
      const activeMemberships = memberships.filter((m) => m.status === 'active');
      if (activeMemberships.length === 0) {
        console.log('⚠️  Пользователь имеет организации, но все членства неактивны');
      } else {
        console.log(`✅ Пользователь имеет ${activeMemberships.length} активных организаций`);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

checkOrganizationStatus();

