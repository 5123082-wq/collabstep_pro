#!/usr/bin/env tsx
/**
 * Скрипт для поиска пользователя по email и отображения всех связанных данных:
 * - Информация о пользователе
 * - Проекты, где он владелец (ownerId)
 * - Проекты, где он участник (PROJECT_MEMBERS)
 * - Задачи, где он исполнитель (assigneeId)
 * - Организации, где он участник
 * - Workspace memberships
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { usersRepository, projectsRepository, tasksRepository } from '../apps/api/src';
import { memory } from '../apps/api/src/data/memory';
import { db } from '../apps/api/src/db/config';
import { users, projects, projectMembers } from '../apps/api/src/db/schema';
import { eq } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function findUser(email: string) {
  console.log(`🔍 Поиск пользователя: ${email}\n`);

  // Находим пользователя через репозиторий (проверяет и память, и БД)
  let user = await usersRepository.findByEmail(email.toLowerCase().trim());

  // Если не найден через репозиторий, проверяем БД напрямую
  if (!user) {
    console.log('⚠️  Пользователь не найден через репозиторий, проверяю базу данных напрямую...\n');
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      if (dbUser) {
        user = {
          id: dbUser.id,
          name: dbUser.name || '',
          email: dbUser.email || '',
          title: dbUser.title || undefined,
          department: dbUser.department || undefined,
          location: dbUser.location || undefined,
          timezone: dbUser.timezone || undefined,
          avatarUrl: dbUser.image || undefined,
          passwordHash: dbUser.passwordHash || undefined
        };
        console.log('✅ Пользователь найден в базе данных\n');
      }
    } catch (error) {
      console.log('⚠️  Не удалось проверить базу данных:', error instanceof Error ? error.message : String(error));
    }
  }

  if (!user) {
    console.log('❌ Пользователь не найден ни в памяти, ни в базе данных');
    console.log('\nПроверьте правильность email или убедитесь, что пользователь зарегистрирован в системе.');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('👤 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`ID: ${user.id}`);
  console.log(`Имя: ${user.name}`);
  console.log(`Email: ${user.email}`);
  if (user.title) console.log(`Должность: ${user.title}`);
  if (user.department) console.log(`Отдел: ${user.department}`);
  if (user.location) console.log(`Локация: ${user.location}`);
  if (user.timezone) console.log(`Часовой пояс: ${user.timezone}`);
  if (user.avatarUrl) console.log(`Аватар: ${user.avatarUrl}`);
  console.log('');

  // Ищем проекты, где пользователь владелец (из памяти)
  let ownedProjects = memory.PROJECTS.filter((p) => p.ownerId === user.id);
  
  // Также проверяем БД напрямую
  try {
    const dbOwnedProjects = await db.select().from(projects).where(eq(projects.ownerId, user.id));
    // Объединяем результаты, избегая дубликатов
    const dbProjectIds = new Set(ownedProjects.map(p => p.id));
    for (const dbProject of dbOwnedProjects) {
      if (!dbProjectIds.has(dbProject.id)) {
        // Преобразуем формат из БД в формат памяти
        ownedProjects.push({
          id: dbProject.id,
          workspaceId: dbProject.workspaceId || '',
          key: dbProject.key || '',
          title: dbProject.title || '',
          description: dbProject.description || undefined,
          ownerId: dbProject.ownerId || '',
          ownerNumber: dbProject.ownerNumber || undefined,
          status: (dbProject.status as any) || 'active',
          deadline: dbProject.deadline || undefined,
          stage: dbProject.stage as any,
          type: dbProject.type as any,
          visibility: (dbProject.visibility as any) || 'private',
          budgetPlanned: dbProject.budgetPlanned,
          budgetSpent: dbProject.budgetSpent,
          workflowId: dbProject.workflowId || undefined,
          archived: dbProject.archived || false,
          createdAt: dbProject.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: dbProject.updatedAt?.toISOString() || new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.log('⚠️  Не удалось проверить проекты в БД:', error instanceof Error ? error.message : String(error));
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📁 ПРОЕКТЫ (ВЛАДЕЛЕЦ): ${ownedProjects.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (ownedProjects.length === 0) {
    console.log('   Нет проектов, где пользователь является владельцем\n');
  } else {
    ownedProjects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.title} (${project.key})`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Статус: ${project.status}`);
      console.log(`   Видимость: ${project.visibility}`);
      if (project.description) {
        console.log(`   Описание: ${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}`);
      }
      console.log(`   Создан: ${project.createdAt}`);
    });
    console.log('');
  }

  // Ищем проекты, где пользователь участник (из памяти)
  const memberProjects: Array<{ project: typeof memory.PROJECTS[0]; role: string }> = [];
  const processedProjectIds = new Set<string>();
  
  for (const project of memory.PROJECTS) {
    const members = memory.PROJECT_MEMBERS[project.id] || [];
    const member = members.find((m) => m.userId === user.id);
    if (member) {
      memberProjects.push({ project, role: member.role });
      processedProjectIds.add(project.id);
    }
  }
  
  // Также проверяем БД напрямую
  try {
    const dbMemberProjects = await db.select({
      project: projects,
      role: projectMembers.role
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, user.id));
    
    for (const item of dbMemberProjects) {
      if (!processedProjectIds.has(item.project.id)) {
        const project = {
          id: item.project.id,
          workspaceId: item.project.workspaceId || '',
          key: item.project.key || '',
          title: item.project.title || '',
          description: item.project.description || undefined,
          ownerId: item.project.ownerId || '',
          ownerNumber: item.project.ownerNumber || undefined,
          status: (item.project.status as any) || 'active',
          deadline: item.project.deadline || undefined,
          stage: item.project.stage as any,
          type: item.project.type as any,
          visibility: (item.project.visibility as any) || 'private',
          budgetPlanned: item.project.budgetPlanned,
          budgetSpent: item.project.budgetSpent,
          workflowId: item.project.workflowId || undefined,
          archived: item.project.archived || false,
          createdAt: item.project.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: item.project.updatedAt?.toISOString() || new Date().toISOString()
        };
        memberProjects.push({ project, role: item.role });
        processedProjectIds.add(project.id);
      }
    }
  } catch (error) {
    console.log('⚠️  Не удалось проверить участников проектов в БД:', error instanceof Error ? error.message : String(error));
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`👥 ПРОЕКТЫ (УЧАСТНИК): ${memberProjects.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (memberProjects.length === 0) {
    console.log('   Нет проектов, где пользователь является участником\n');
  } else {
    memberProjects.forEach((item, index) => {
      const { project, role } = item;
      console.log(`\n${index + 1}. ${project.title} (${project.key})`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Роль: ${role}`);
      console.log(`   Статус: ${project.status}`);
      console.log(`   Видимость: ${project.visibility}`);
    });
    console.log('');
  }

  // Ищем задачи, где пользователь исполнитель (из памяти)
  let assignedTasks = memory.TASKS.filter((t) => t.assigneeId === user.id);
  
  // Также проверяем БД напрямую через pm_tasks таблицу
  try {
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      // Используем динамический импорт для @vercel/postgres
      const postgres = await import('@vercel/postgres');
      const sql = postgres.sql || (postgres as any).default?.sql;
      if (!sql) {
        throw new Error('Не удалось импортировать sql из @vercel/postgres');
      }
      const result = await sql.query(`
        SELECT * FROM pm_tasks 
        WHERE assignee_id = $1
      `, [user.id]);
      
      // Объединяем результаты, избегая дубликатов
      const taskIds = new Set(assignedTasks.map(t => t.id));
      for (const dbTask of result.rows) {
        if (!taskIds.has(dbTask.id)) {
          // Преобразуем формат из БД в формат памяти
          assignedTasks.push({
            id: dbTask.id,
            projectId: dbTask.project_id || '',
            number: dbTask.number || 0,
            parentId: dbTask.parent_id || null,
            title: dbTask.title || '',
            description: dbTask.description || undefined,
            status: (dbTask.status as any) || 'new',
            iterationId: dbTask.iteration_id || undefined,
            assigneeId: dbTask.assignee_id || undefined,
            startAt: dbTask.start_at || dbTask.start_date || undefined,
            startDate: dbTask.start_at || dbTask.start_date || undefined,
            dueAt: dbTask.due_at || undefined,
            priority: dbTask.priority as any,
            labels: Array.isArray(dbTask.labels) ? dbTask.labels : undefined,
            estimatedTime: dbTask.estimated_time || undefined,
            storyPoints: dbTask.story_points || undefined,
            loggedTime: dbTask.logged_time || undefined,
            price: dbTask.price || undefined,
            currency: dbTask.currency || undefined,
            attachments: [],
            createdAt: dbTask.created_at || new Date().toISOString(),
            updatedAt: dbTask.updated_at || new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Не удалось проверить задачи в БД:', error instanceof Error ? error.message : String(error));
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ ЗАДАЧИ (ИСПОЛНИТЕЛЬ): ${assignedTasks.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (assignedTasks.length === 0) {
    console.log('   Нет задач, назначенных на пользователя\n');
  } else {
    // Группируем по проектам
    const tasksByProject = new Map<string, typeof assignedTasks>();
    for (const task of assignedTasks) {
      if (!tasksByProject.has(task.projectId)) {
        tasksByProject.set(task.projectId, []);
      }
      tasksByProject.get(task.projectId)!.push(task);
    }

    for (const [projectId, tasks] of tasksByProject.entries()) {
      const project = memory.PROJECTS.find((p) => p.id === projectId);
      const projectTitle = project ? `${project.title} (${project.key})` : `Проект ${projectId}`;
      console.log(`\n📁 ${projectTitle}: ${tasks.length} задач`);
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} [${task.status}]`);
        console.log(`      ID: ${task.id}`);
        console.log(`      Номер: ${task.number}`);
        if (task.priority) console.log(`      Приоритет: ${task.priority}`);
        if (task.dueAt) console.log(`      Срок: ${task.dueAt}`);
      });
    }
    console.log('');
  }

  // Ищем организации, где пользователь участник
  const orgMembers = memory.ORGANIZATION_MEMBERS.filter((m) => m.userId === user.id);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🏢 ОРГАНИЗАЦИИ: ${orgMembers.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (orgMembers.length === 0) {
    console.log('   Пользователь не является участником организаций\n');
  } else {
    orgMembers.forEach((member, index) => {
      const org = memory.ORGANIZATIONS.find((o) => o.id === member.organizationId);
      console.log(`\n${index + 1}. ${org?.name || `Организация ${member.organizationId}`}`);
      console.log(`   Роль: ${member.role}`);
      console.log(`   Статус: ${member.status}`);
      console.log(`   Присоединился: ${member.createdAt.toISOString()}`);
    });
    console.log('');
  }

  // Ищем workspace memberships
  const workspaceMemberships: Array<{ workspaceId: string; role: string }> = [];
  for (const [workspaceId, members] of Object.entries(memory.WORKSPACE_MEMBERS)) {
    const member = members.find((m) => m.userId === user.id);
    if (member) {
      workspaceMemberships.push({ workspaceId, role: member.role });
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`💼 WORKSPACE MEMBERSHIPS: ${workspaceMemberships.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (workspaceMemberships.length === 0) {
    console.log('   Пользователь не является участником workspace\n');
  } else {
    workspaceMemberships.forEach((membership, index) => {
      const workspace = memory.WORKSPACES.find((w) => w.id === membership.workspaceId);
      console.log(`\n${index + 1}. ${workspace?.name || `Workspace ${membership.workspaceId}`}`);
      console.log(`   Роль: ${membership.role}`);
      if (workspace?.description) {
        console.log(`   Описание: ${workspace.description}`);
      }
    });
    console.log('');
  }

  // Ищем account memberships
  const accountMemberships = memory.ACCOUNT_MEMBERS.filter((m) => m.userId === user.id);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📋 ACCOUNT MEMBERSHIPS: ${accountMemberships.length}`);
  console.log('═══════════════════════════════════════════════════════════');
  if (accountMemberships.length === 0) {
    console.log('   Пользователь не является участником аккаунтов\n');
  } else {
    accountMemberships.forEach((member, index) => {
      const account = memory.ACCOUNTS.find((a) => a.id === member.accountId);
      console.log(`\n${index + 1}. ${account?.name || `Account ${member.accountId}`}`);
      console.log(`   Роль: ${member.role}`);
    });
    console.log('');
  }

  // Сводка
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 СВОДКА');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Проектов (владелец): ${ownedProjects.length}`);
  console.log(`   Проектов (участник): ${memberProjects.length}`);
  console.log(`   Задач (исполнитель): ${assignedTasks.length}`);
  console.log(`   Организаций: ${orgMembers.length}`);
  console.log(`   Workspaces: ${workspaceMemberships.length}`);
  console.log(`   Accounts: ${accountMemberships.length}`);

  process.exit(0);
}

// Получаем email из аргументов командной строки
const email = process.argv[2];

if (!email) {
  console.error('❌ Ошибка: не указан email');
  console.log('\nИспользование:');
  console.log('  pnpm tsx scripts/find-user.ts <email>');
  console.log('\nПример:');
  console.log('  pnpm tsx scripts/find-user.ts karakyan@ya.ru');
  process.exit(1);
}

findUser(email).catch((error) => {
  console.error('❌ Ошибка при поиске пользователя:', error);
  process.exit(1);
});
