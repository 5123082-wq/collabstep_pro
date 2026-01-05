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
  projects as projectsTable,
  tasks as tasksTable
} from '@collabverse/api/db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';

async function diagnoseDbIssues() {
  try {
    console.log('🔍 Диагностика проблем с БД...\n');

    // 1. Проверка пользователя Администратор
    const adminEmail = 'admin.demo@collabverse.test';
    console.log(`📧 Проверка пользователя: ${adminEmail}`);
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (adminUser.length === 0) {
      console.log('❌ Пользователь Администратор не найден в БД!\n');
      return;
    }

    const user = adminUser[0];
    console.log(`✅ Пользователь найден: ${user.id} (${user.email})\n`);

    // 2. Проверка организаций
    console.log('📂 Проверка организаций...');
    const ownedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, user.id));

    console.log(`   Владелец организаций: ${ownedOrgs.length}`);
    ownedOrgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.id})`);
    });

    const memberOrgs = await db
      .select({
        orgName: organizations.name,
        orgId: organizations.id,
        role: organizationMembers.role,
        isPrimary: organizationMembers.isPrimary
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, user.id));

    console.log(`   Участник организаций: ${memberOrgs.length}`);
    memberOrgs.forEach((item) => {
      console.log(
        `   - ${item.orgName} (${item.orgId}) [${item.role}]${item.isPrimary ? ' [PRIMARY]' : ''}`
      );
    });

    // 3. Проверка всех проектов
    console.log('\n📁 Проверка проектов...');
    const allProjects = await db.select().from(projectsTable);
    console.log(`   Всего проектов в БД: ${allProjects.length}`);

    // Проекты пользователя
    const userProjects = allProjects.filter((p) => p.ownerId === user.id);
    console.log(`   Проектов пользователя: ${userProjects.length}`);

    // Проекты с организациями
    const orgProjects = allProjects.filter((p) => p.organizationId !== null);
    console.log(`   Проектов с организациями: ${orgProjects.length}`);

    // Проекты без организаций
    const orphanedProjects = allProjects.filter((p) => p.organizationId === null);
    console.log(`   ⚠️  Проектов БЕЗ организаций: ${orphanedProjects.length}`);
    if (orphanedProjects.length > 0) {
      orphanedProjects.forEach((p) => {
        console.log(`   - ${p.name} (${p.id}) - создан: ${p.createdAt}`);
      });
    }

    // 4. Проверка "осиротевших" проектов (без задач)
    console.log('\n🔗 Проверка проектов без задач...');
    const projectsWithTasks = await db
      .selectDistinct({ projectId: tasksTable.projectId })
      .from(tasksTable);

    const projectIdsWithTasks = new Set(projectsWithTasks.map((t) => t.projectId).filter(Boolean));
    const orphanedProjectsNoTasks = allProjects.filter((p) => !projectIdsWithTasks.has(p.id));

    console.log(`   ⚠️  Проектов БЕЗ задач: ${orphanedProjectsNoTasks.length}`);
    if (orphanedProjectsNoTasks.length > 0) {
      orphanedProjectsNoTasks.forEach((p) => {
        console.log(
          `   - ${p.name} (${p.id}) - org: ${p.organizationId || 'NONE'} - создан: ${p.createdAt}`
        );
      });
    }

    // 5. Проверка проектов с несуществующими организациями
    console.log('\n🔍 Проверка проектов с несуществующими организациями...');
    const allOrgIds = new Set(
      (await db.select({ id: organizations.id }).from(organizations)).map((o) => o.id)
    );

    const projectsWithInvalidOrgs = allProjects.filter(
      (p) => p.organizationId !== null && !allOrgIds.has(p.organizationId)
    );

    console.log(`   ⚠️  Проектов с несуществующими организациями: ${projectsWithInvalidOrgs.length}`);
    if (projectsWithInvalidOrgs.length > 0) {
      projectsWithInvalidOrgs.forEach((p) => {
        console.log(
          `   - ${p.name} (${p.id}) - orgId: ${p.organizationId} - создан: ${p.createdAt}`
        );
      });
    }

    // 6. Проверка тестовых проектов
    console.log('\n🧪 Проверка тестовых проектов...');
    const testProjectKeywords = ['тест', 'test', 'demo', 'демо'];
    const testProjects = allProjects.filter((p) =>
      testProjectKeywords.some((keyword) => p.name.toLowerCase().includes(keyword))
    );

    console.log(`   Тестовых проектов: ${testProjects.length}`);
    if (testProjects.length > 0) {
      testProjects.forEach((p) => {
        const taskCount = projectIdsWithTasks.has(p.id) ? 'есть задачи' : 'БЕЗ задач';
        console.log(
          `   - ${p.name} (${p.id}) - org: ${p.organizationId || 'NONE'} - ${taskCount} - создан: ${p.createdAt}`
        );
      });
    }

    // 7. Статистика по задачам
    console.log('\n📊 Статистика по задачам...');
    const allTasks = await db.select().from(tasksTable);
    console.log(`   Всего задач в БД: ${allTasks.length}`);

    const tasksByProject = new Map<string, number>();
    allTasks.forEach((task) => {
      if (task.projectId) {
        tasksByProject.set(task.projectId, (tasksByProject.get(task.projectId) || 0) + 1);
      }
    });

    console.log(`   Проектов с задачами: ${tasksByProject.size}`);

    // 8. Резюме проблем
    console.log('\n📋 РЕЗЮМЕ ПРОБЛЕМ:');
    const issues: string[] = [];

    if (ownedOrgs.length === 0 && memberOrgs.length === 0) {
      issues.push('❌ КРИТИЧНО: Пользователь не имеет ни одной организации!');
    }

    if (orphanedProjects.length > 0) {
      issues.push(`⚠️  Найдено ${orphanedProjects.length} проектов без организаций`);
    }

    if (orphanedProjectsNoTasks.length > 0) {
      issues.push(`⚠️  Найдено ${orphanedProjectsNoTasks.length} "осиротевших" проектов (без задач)`);
    }

    if (projectsWithInvalidOrgs.length > 0) {
      issues.push(
        `❌ КРИТИЧНО: Найдено ${projectsWithInvalidOrgs.length} проектов с несуществующими организациями!`
      );
    }

    if (testProjects.length > 10) {
      issues.push(`⚠️  Обнаружено много тестовых проектов: ${testProjects.length}`);
    }

    if (issues.length === 0) {
      console.log('✅ Серьезных проблем не обнаружено');
    } else {
      issues.forEach((issue) => console.log(`   ${issue}`));
    }
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

diagnoseDbIssues();

