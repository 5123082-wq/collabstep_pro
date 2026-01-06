/**
 * Скрипт для анализа всех зависимостей организации перед удалением
 * 
 * Проверяет все связи организации с другими сущностями:
 * - Участники организации
 * - Проекты организации
 * - Задачи в проектах организации
 * - Документы организации
 * - Файлы организации
 * - Приглашения организации
 * - Подписки пользователей
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import {
  projectsRepository,
  tasksRepository,
  organizationsRepository,
  memory
} from '@collabverse/api';
import { isPmDbEnabled } from '@collabverse/api/storage/pm-pg-adapter';
import { sql as vercelSql } from '@vercel/postgres';
import { db } from '@collabverse/api/db/config';
import { 
  organizationMembers, 
  projects as projectsTable,
  projectInvites,
  organizationInvites,
  userSubscriptions
} from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';

const TARGET_ORG_ID = 'acct-collabverse';

interface DependencyReport {
  organization: {
    id: string;
    name: string;
    existsInDb: boolean;
    existsInMemory: boolean;
  };
  members: {
    inDb: number;
    inMemory: number;
    details: Array<{ userId: string; role: string; source: string }>;
  };
  projects: {
    inDb: number;
    inMemory: number;
    details: Array<{ id: string; title: string; source: string }>;
  };
  tasks: {
    total: number;
    byProject: Map<string, number>;
  };
  invites: {
    organizationInvites: number;
    projectInvites: number;
  };
  subscriptions: {
    count: number;
    details: Array<{ userId: string; planCode: string }>;
  };
  files: {
    attachments: number;
    documents: number;
  };
}

async function analyzeOrganizationDependencies(orgId: string): Promise<DependencyReport> {
  const report: DependencyReport = {
    organization: {
      id: orgId,
      name: '',
      existsInDb: false,
      existsInMemory: false
    },
    members: {
      inDb: 0,
      inMemory: 0,
      details: []
    },
    projects: {
      inDb: 0,
      inMemory: 0,
      details: []
    },
    tasks: {
      total: 0,
      byProject: new Map()
    },
    invites: {
      organizationInvites: 0,
      projectInvites: 0
    },
    subscriptions: {
      count: 0,
      details: []
    },
    files: {
      attachments: 0,
      documents: 0
    }
  };

  console.log(`🔍 Анализ зависимостей организации: ${orgId}\n`);
  console.log('='.repeat(80));

  // 1. Проверка существования организации
  console.log('\n📂 1. ОРГАНИЗАЦИЯ\n');

  // В БД
  if (isPmDbEnabled()) {
    try {
      const dbOrgResult = await vercelSql.query(
        'SELECT * FROM organization WHERE id = $1',
        [orgId]
      );
      if (dbOrgResult.rows && dbOrgResult.rows.length > 0) {
        report.organization.existsInDb = true;
        report.organization.name = dbOrgResult.rows[0].name || 'N/A';
        console.log(`   ✅ Найдена в БД: ${report.organization.name}`);
      } else {
        console.log(`   ❌ Не найдена в БД`);
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка при проверке БД: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // В памяти
  const memoryOrg = memory.ORGANIZATIONS.find(org => org.id === orgId);
  if (memoryOrg) {
    report.organization.existsInMemory = true;
    report.organization.name = memoryOrg.name || 'N/A';
    console.log(`   ✅ Найдена в памяти: ${report.organization.name}`);
  } else {
    console.log(`   ❌ Не найдена в памяти`);
  }

  // 2. Участники организации
  console.log('\n👥 2. УЧАСТНИКИ ОРГАНИЗАЦИИ\n');

  // В БД
  if (isPmDbEnabled()) {
    try {
      const dbMembers = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, orgId));
      
      report.members.inDb = dbMembers.length;
      report.members.details.push(...dbMembers.map(m => ({
        userId: m.userId,
        role: m.role,
        source: 'DB'
      })));
      console.log(`   БД: ${dbMembers.length} участников`);
      if (dbMembers.length > 0) {
        dbMembers.forEach(m => {
          console.log(`      - userId: ${m.userId}, role: ${m.role}`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка при проверке участников в БД: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // В памяти
  const memoryMembers = memory.ORGANIZATION_MEMBERS.filter(m => m.organizationId === orgId);
  report.members.inMemory = memoryMembers.length;
  report.members.details.push(...memoryMembers.map(m => ({
    userId: m.userId,
    role: m.role,
    source: 'Memory'
  })));
  console.log(`   Память: ${memoryMembers.length} участников`);
  if (memoryMembers.length > 0) {
    memoryMembers.forEach(m => {
      console.log(`      - userId: ${m.userId}, role: ${m.role}`);
    });
  }

  // 3. Проекты организации
  console.log('\n📁 3. ПРОЕКТЫ ОРГАНИЗАЦИИ\n');

  // В БД (deprecated таблица project)
  if (isPmDbEnabled()) {
    try {
      const dbProjects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.organizationId, orgId));
      
      report.projects.inDb = dbProjects.length;
      report.projects.details.push(...dbProjects.map(p => ({
        id: p.id,
        title: p.name || 'N/A',
        source: 'DB (deprecated project table)'
      })));
      console.log(`   БД (deprecated project table): ${dbProjects.length} проектов`);
      if (dbProjects.length > 0) {
        dbProjects.forEach(p => {
          console.log(`      - ${p.name || 'N/A'} (${p.id})`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка при проверке проектов в БД: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // В памяти (проекты могут быть связаны через workspaceId или ownerId)
  // Проверяем проекты, созданные участниками организации
  const orgMemberIds = new Set(report.members.details.map(m => m.userId));
  const memoryProjects = memory.PROJECTS.filter(p => {
    // Проект может принадлежать организации через ownerId (если owner - участник)
    return orgMemberIds.has(p.ownerId);
  });
  
  report.projects.inMemory = memoryProjects.length;
  report.projects.details.push(...memoryProjects.map(p => ({
    id: p.id,
    title: p.title || 'N/A',
    source: 'Memory (by owner)'
  })));
  console.log(`   Память (проекты участников): ${memoryProjects.length} проектов`);
  if (memoryProjects.length > 0) {
    memoryProjects.forEach(p => {
      console.log(`      - ${p.title || 'N/A'} (${p.id}), owner: ${p.ownerId}`);
    });
  }

  // 4. Задачи в проектах организации
  console.log('\n📋 4. ЗАДАЧИ В ПРОЕКТАХ ОРГАНИЗАЦИИ\n');

  const projectIds = new Set([
    ...report.projects.details.map(p => p.id),
    ...memoryProjects.map(p => p.id)
  ]);

  if (projectIds.size > 0) {
    // В БД
    if (isPmDbEnabled()) {
      try {
        const projectIdsArray = Array.from(projectIds);
        for (const projectId of projectIdsArray) {
          const tasksResult = await vercelSql.query(
            'SELECT COUNT(*) as count FROM pm_tasks WHERE project_id = $1',
            [projectId]
          );
          const count = parseInt(tasksResult.rows[0]?.count || '0', 10);
          if (count > 0) {
            report.tasks.byProject.set(projectId, count);
            report.tasks.total += count;
          }
        }
        console.log(`   БД: ${report.tasks.total} задач в ${projectIds.size} проектах`);
        report.tasks.byProject.forEach((count, projectId) => {
          const project = report.projects.details.find(p => p.id === projectId);
          console.log(`      - ${project?.title || projectId}: ${count} задач`);
        });
      } catch (error) {
        console.log(`   ⚠️  Ошибка при проверке задач в БД: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    // В памяти
    const memoryTasks = memory.TASKS.filter(t => projectIds.has(t.projectId));
    console.log(`   Память: ${memoryTasks.length} задач`);
  } else {
    console.log(`   Нет проектов для проверки задач`);
  }

  // 5. Приглашения
  console.log('\n✉️  5. ПРИГЛАШЕНИЯ\n');

  if (isPmDbEnabled()) {
    try {
      // Приглашения в организацию
      const orgInvites = await db
        .select()
        .from(organizationInvites)
        .where(eq(organizationInvites.organizationId, orgId));
      
      report.invites.organizationInvites = orgInvites.length;
      console.log(`   Приглашения в организацию: ${orgInvites.length}`);

      // Приглашения в проекты организации
      if (projectIds.size > 0) {
        const projectIdsArray = Array.from(projectIds);
        const projectInvitesList = await db
          .select()
          .from(projectInvites)
          .where(eq(projectInvites.organizationId, orgId));
        
        report.invites.projectInvites = projectInvitesList.length;
        console.log(`   Приглашения в проекты: ${projectInvitesList.length}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка при проверке приглашений: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // 6. Подписки пользователей
  console.log('\n💳 6. ПОДПИСКИ ПОЛЬЗОВАТЕЛЕЙ\n');

  if (isPmDbEnabled()) {
    try {
      // Подписки связаны через organizationId в user_subscriptions
      const subscriptions = await vercelSql.query(
        'SELECT user_id, plan_code FROM user_subscription WHERE organization_id = $1',
        [orgId]
      );
      
      report.subscriptions.count = subscriptions.rows?.length || 0;
      report.subscriptions.details = (subscriptions.rows || []).map((row: any) => ({
        userId: row.user_id,
        planCode: row.plan_code || 'N/A'
      }));
      console.log(`   Подписки: ${report.subscriptions.count}`);
      if (report.subscriptions.details.length > 0) {
        report.subscriptions.details.forEach(sub => {
          console.log(`      - userId: ${sub.userId}, plan: ${sub.planCode}`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Ошибка при проверке подписок: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // 7. Файлы и документы
  console.log('\n📎 7. ФАЙЛЫ И ДОКУМЕНТЫ\n');

  // Вложения (attachments) могут быть связаны через projectId
  const attachments = memory.ATTACHMENTS.filter(att => {
    return projectIds.has(att.projectId || '');
  });
  report.files.attachments = attachments.length;
  console.log(`   Вложения (attachments): ${attachments.length}`);

  // Документы
  const documents = memory.DOCUMENTS.filter(doc => {
    return projectIds.has(doc.projectId || '');
  });
  report.files.documents = documents.length;
  console.log(`   Документы: ${documents.length}`);

  return report;
}

async function generateReport(orgId: string) {
  try {
    const report = await analyzeOrganizationDependencies(orgId);

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ\n');
    console.log('='.repeat(80));

    console.log(`\nОрганизация: ${report.organization.name || orgId}`);
    console.log(`   ID: ${report.organization.id}`);
    console.log(`   В БД: ${report.organization.existsInDb ? '✅' : '❌'}`);
    console.log(`   В памяти: ${report.organization.existsInMemory ? '✅' : '❌'}`);

    console.log(`\n📊 СВЯЗАННЫЕ ДАННЫЕ:`);
    console.log(`   👥 Участники: ${report.members.inDb + report.members.inMemory} (БД: ${report.members.inDb}, Память: ${report.members.inMemory})`);
    console.log(`   📁 Проекты: ${report.projects.inDb + report.projects.inMemory} (БД: ${report.projects.inDb}, Память: ${report.projects.inMemory})`);
    console.log(`   📋 Задачи: ${report.tasks.total} (в ${report.tasks.byProject.size} проектах)`);
    console.log(`   ✉️  Приглашения: ${report.invites.organizationInvites + report.invites.projectInvites} (в орг: ${report.invites.organizationInvites}, в проекты: ${report.invites.projectInvites})`);
    console.log(`   💳 Подписки: ${report.subscriptions.count}`);
    console.log(`   📎 Файлы: ${report.files.attachments + report.files.documents} (вложения: ${report.files.attachments}, документы: ${report.files.documents})`);

    const totalRelated = 
      report.members.inDb + report.members.inMemory +
      report.projects.inDb + report.projects.inMemory +
      report.tasks.total +
      report.invites.organizationInvites + report.invites.projectInvites +
      report.subscriptions.count +
      report.files.attachments + report.files.documents;

    console.log(`\n⚠️  ВСЕГО СВЯЗАННЫХ ЗАПИСЕЙ: ${totalRelated}`);

    if (totalRelated > 0) {
      console.log(`\n⚠️  ВНИМАНИЕ: Удаление организации затронет ${totalRelated} связанных записей!`);
      console.log(`\n💡 Рекомендации:`);
      console.log(`   1. Убедитесь, что хотите удалить все связанные данные`);
      console.log(`   2. Рассмотрите возможность архивации вместо удаления`);
      console.log(`   3. Создайте резервную копию перед удалением`);
    } else {
      console.log(`\n✅ Организация не имеет связанных данных, безопасно для удаления`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

generateReport(TARGET_ORG_ID);

