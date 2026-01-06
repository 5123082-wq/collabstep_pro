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
import {
  projectsRepository,
  tasksRepository,
  organizationsRepository,
  memory
} from '@collabverse/api';
import { isPmDbEnabled } from '@collabverse/api/storage/pm-pg-adapter';
import { sql as vercelSql } from '@vercel/postgres';
import { eq } from 'drizzle-orm';

interface DataLocation {
  id: string;
  type: 'project' | 'task' | 'organization';
  name: string;
  location: 'db' | 'memory' | 'both';
  dbTable?: string;
  memoryKey?: string;
  source: string;
  details: string;
}

const results: DataLocation[] = [];

async function auditData() {
  try {
    console.log('🔍 Комплексный аудит данных...\n');
    console.log('Поиск во всех возможных местах: БД (Drizzle + SQL) и память\n');

    const adminEmail = 'admin.demo@collabverse.test';
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (adminUser.length === 0) {
      console.log('❌ Пользователь не найден');
      return;
    }

    const user = adminUser[0];
    console.log(`✅ Пользователь: ${user.id} (${user.email})\n`);

    // ============================================
    // 1. ОРГАНИЗАЦИИ
    // ============================================
    console.log('📂 АУДИТ ОРГАНИЗАЦИЙ...\n');

    // БД через Drizzle
    const orgsFromDrizzle = await db.select().from(organizations);
    console.log(`   Drizzle (organizations table): ${orgsFromDrizzle.length} организаций`);

    // БД через прямой SQL
    let orgsFromSql: any[] = [];
    try {
      const sqlResult = await vercelSql.query('SELECT * FROM organization');
      orgsFromSql = sqlResult.rows || [];
      console.log(`   SQL (organization table): ${orgsFromSql.length} организаций`);
    } catch (error) {
      console.log(`   SQL (organization table): ошибка - ${error instanceof Error ? error.message : 'unknown'}`);
    }

    // Память
    const orgsFromMemory = memory.ORGANIZATIONS || [];
    console.log(`   Memory (memory.ORGANIZATIONS): ${orgsFromMemory.length} организаций`);

    // Репозиторий (для пользователя)
    const orgsFromRepo = await organizationsRepository.listForUser(user.id);
    console.log(`   Repository (listForUser): ${orgsFromRepo.length} организаций\n`);

    // Собираем все уникальные организации
    const allOrgsMap = new Map<string, DataLocation>();

    orgsFromDrizzle.forEach((org) => {
      const key = org.id;
      if (!allOrgsMap.has(key)) {
        allOrgsMap.set(key, {
          id: org.id,
          type: 'organization',
          name: org.name,
          location: 'db',
          dbTable: 'organization',
          source: 'Drizzle ORM',
          details: `ownerId: ${org.ownerId}, status: ${org.status || 'N/A'}`
        });
      } else {
        const existing = allOrgsMap.get(key)!;
        existing.location = 'both';
        existing.details += ' | Также в Drizzle';
      }
    });

    orgsFromSql.forEach((org: any) => {
      const key = org.id;
      if (!allOrgsMap.has(key)) {
        allOrgsMap.set(key, {
          id: org.id,
          type: 'organization',
          name: org.name,
          location: 'db',
          dbTable: 'organization',
          source: 'Direct SQL',
          details: `ownerId: ${org.owner_id || org.ownerId}, status: ${org.status || 'N/A'}`
        });
      } else {
        const existing = allOrgsMap.get(key)!;
        if (existing.source !== 'Direct SQL') {
          existing.source += ' + Direct SQL';
        }
      }
    });

    orgsFromMemory.forEach((org) => {
      const key = org.id;
      if (!allOrgsMap.has(key)) {
        allOrgsMap.set(key, {
          id: org.id,
          type: 'organization',
          name: org.name,
          location: 'memory',
          memoryKey: 'memory.ORGANIZATIONS',
          source: 'Memory',
          details: `ownerId: ${org.ownerId}, status: ${org.status || 'N/A'}`
        });
      } else {
        const existing = allOrgsMap.get(key)!;
        existing.location = existing.location === 'db' ? 'both' : 'memory';
        existing.memoryKey = 'memory.ORGANIZATIONS';
        existing.details += ' | Также в памяти';
      }
    });

    allOrgsMap.forEach((org) => results.push(org));

    // ============================================
    // 2. ПРОЕКТЫ
    // ============================================
    console.log('📁 АУДИТ ПРОЕКТОВ...\n');

    // БД через Drizzle
    const projectsFromDrizzle = await db.select().from(projectsTable);
    console.log(`   Drizzle (project table): ${projectsFromDrizzle.length} проектов`);

    // БД через прямой SQL (pm_projects)
    let projectsFromSql: any[] = [];
    try {
      const sqlResult = await vercelSql.query('SELECT * FROM pm_projects');
      projectsFromSql = sqlResult.rows || [];
      console.log(`   SQL (pm_projects table): ${projectsFromSql.length} проектов`);
    } catch (error) {
      console.log(`   SQL (pm_projects table): ошибка - ${error instanceof Error ? error.message : 'unknown'}`);
    }

    // Память
    const projectsFromMemory = memory.PROJECTS || [];
    console.log(`   Memory (memory.PROJECTS): ${projectsFromMemory.length} проектов`);

    // Репозиторий
    const projectsFromRepo = projectsRepository.list();
    console.log(`   Repository (projectsRepository.list): ${projectsFromRepo.length} проектов\n`);

    // Собираем все уникальные проекты
    const allProjectsMap = new Map<string, DataLocation>();

    projectsFromDrizzle.forEach((project) => {
      const key = project.id;
      if (!allProjectsMap.has(key)) {
        allProjectsMap.set(key, {
          id: project.id,
          type: 'project',
          name: project.name,
          location: 'db',
          dbTable: 'project',
          source: 'Drizzle ORM',
          details: `ownerId: ${project.ownerId}, orgId: ${project.organizationId || 'N/A'}`
        });
      } else {
        const existing = allProjectsMap.get(key)!;
        existing.location = 'both';
        existing.details += ' | Также в Drizzle';
      }
    });

    projectsFromSql.forEach((project: any) => {
      const key = project.id;
      if (!allProjectsMap.has(key)) {
        allProjectsMap.set(key, {
          id: project.id,
          type: 'project',
          name: project.title || project.name,
          location: 'db',
          dbTable: 'pm_projects',
          source: 'Direct SQL (pm_projects)',
          details: `ownerId: ${project.owner_id || project.ownerId}, workspaceId: ${project.workspace_id || 'N/A'}`
        });
      } else {
        const existing = allProjectsMap.get(key)!;
        if (!existing.details.includes('pm_projects')) {
          existing.source += ' + pm_projects';
        }
      }
    });

    projectsFromMemory.forEach((project) => {
      const key = project.id;
      if (!allProjectsMap.has(key)) {
        allProjectsMap.set(key, {
          id: project.id,
          type: 'project',
          name: project.title,
          location: 'memory',
          memoryKey: 'memory.PROJECTS',
          source: 'Memory',
          details: `ownerId: ${project.ownerId}, workspaceId: ${project.workspaceId}`
        });
      } else {
        const existing = allProjectsMap.get(key)!;
        existing.location = existing.location === 'db' ? 'both' : 'memory';
        existing.memoryKey = 'memory.PROJECTS';
        existing.details += ' | Также в памяти';
      }
    });

    allProjectsMap.forEach((project) => results.push(project));

    // ============================================
    // 3. ЗАДАЧИ
    // ============================================
    console.log('📋 АУДИТ ЗАДАЧ...\n');

    // БД через прямой SQL (pm_tasks)
    let tasksFromSql: any[] = [];
    if (isPmDbEnabled()) {
      try {
        const sqlResult = await vercelSql.query('SELECT * FROM pm_tasks');
        tasksFromSql = sqlResult.rows || [];
        console.log(`   SQL (pm_tasks table): ${tasksFromSql.length} задач`);
      } catch (error) {
        console.log(`   SQL (pm_tasks table): ошибка - ${error instanceof Error ? error.message : 'unknown'}`);
      }
    } else {
      console.log(`   SQL (pm_tasks table): БД не включена (isPmDbEnabled = false)`);
    }

    // Память
    const tasksFromMemory = memory.TASKS || [];
    console.log(`   Memory (memory.TASKS): ${tasksFromMemory.length} задач`);

    // Репозиторий
    const tasksFromRepo = tasksRepository.list();
    console.log(`   Repository (tasksRepository.list): ${tasksFromRepo.length} задач\n`);

    // Собираем все уникальные задачи
    const allTasksMap = new Map<string, DataLocation>();

    tasksFromSql.forEach((task: any) => {
      const key = task.id;
      if (!allTasksMap.has(key)) {
        allTasksMap.set(key, {
          id: task.id,
          type: 'task',
          name: task.title,
          location: 'db',
          dbTable: 'pm_tasks',
          source: 'Direct SQL (pm_tasks)',
          details: `projectId: ${task.project_id || task.projectId}, status: ${task.status || 'N/A'}`
        });
      }
    });

    tasksFromMemory.forEach((task) => {
      const key = task.id;
      if (!allTasksMap.has(key)) {
        allTasksMap.set(key, {
          id: task.id,
          type: 'task',
          name: task.title,
          location: 'memory',
          memoryKey: 'memory.TASKS',
          source: 'Memory',
          details: `projectId: ${task.projectId}, status: ${task.status || 'N/A'}`
        });
      } else {
        const existing = allTasksMap.get(key)!;
        existing.location = 'both';
        existing.memoryKey = 'memory.TASKS';
        existing.details += ' | Также в памяти';
      }
    });

    allTasksMap.forEach((task) => results.push(task));

    // ============================================
    // 4. ВЫВОД РЕЗУЛЬТАТОВ В ТАБЛИЦУ
    // ============================================
    console.log('\n' + '='.repeat(100));
    console.log('📊 РЕЗУЛЬТАТЫ АУДИТА ДАННЫХ');
    console.log('='.repeat(100) + '\n');

    // Группировка по типам
    const byType = {
      organization: results.filter((r) => r.type === 'organization'),
      project: results.filter((r) => r.type === 'project'),
      task: results.filter((r) => r.type === 'task')
    };

    console.log(`Всего найдено:`);
    console.log(`  - Организаций: ${byType.organization.length}`);
    console.log(`  - Проектов: ${byType.project.length}`);
    console.log(`  - Задач: ${byType.task.length}`);
    console.log(`  - Всего записей: ${results.length}\n`);

    // Таблица организаций
    console.log('📂 ОРГАНИЗАЦИИ:');
    console.log('-'.repeat(100));
    console.log(
      `${'ID'.padEnd(40)} | ${'Название'.padEnd(30)} | ${'Расположение'.padEnd(15)} | ${'Источник'.padEnd(25)}`
    );
    console.log('-'.repeat(100));
    byType.organization.forEach((org) => {
      const location = org.location === 'both' ? 'БД + Память' : org.location === 'db' ? 'БД' : 'Память';
      const source = org.source;
      const name = (org.name || 'N/A').substring(0, 30);
      console.log(
        `${org.id.substring(0, 40).padEnd(40)} | ${name.padEnd(30)} | ${location.padEnd(15)} | ${source.padEnd(25)}`
      );
    });
    console.log('-'.repeat(100) + '\n');

    // Таблица проектов
    console.log('📁 ПРОЕКТЫ:');
    console.log('-'.repeat(100));
    console.log(
      `${'ID'.padEnd(40)} | ${'Название'.padEnd(30)} | ${'Расположение'.padEnd(15)} | ${'Источник'.padEnd(30)}`
    );
    console.log('-'.repeat(100));
    byType.project.forEach((project) => {
      const location = project.location === 'both' ? 'БД + Память' : project.location === 'db' ? 'БД' : 'Память';
      const source = project.source;
      const name = (project.name || 'N/A').substring(0, 30);
      console.log(
        `${project.id.substring(0, 40).padEnd(40)} | ${name.padEnd(30)} | ${location.padEnd(15)} | ${source.padEnd(30)}`
      );
    });
    console.log('-'.repeat(100) + '\n');

    // Таблица задач (первые 50 для читаемости)
    console.log('📋 ЗАДАЧИ (первые 50):');
    console.log('-'.repeat(100));
    console.log(
      `${'ID'.padEnd(40)} | ${'Название'.padEnd(30)} | ${'Расположение'.padEnd(15)} | ${'Источник'.padEnd(30)}`
    );
    console.log('-'.repeat(100));
    byType.task.slice(0, 50).forEach((task) => {
      const location = task.location === 'both' ? 'БД + Память' : task.location === 'db' ? 'БД' : 'Память';
      const source = task.source;
      const name = (task.name || 'N/A').substring(0, 30);
      console.log(
        `${task.id.substring(0, 40).padEnd(40)} | ${name.padEnd(30)} | ${location.padEnd(15)} | ${source.padEnd(30)}`
      );
    });
    if (byType.task.length > 50) {
      console.log(`... и еще ${byType.task.length - 50} задач`);
    }
    console.log('-'.repeat(100) + '\n');

    // Статистика по расположению
    console.log('📊 СТАТИСТИКА ПО РАСПОЛОЖЕНИЮ:');
    console.log('-'.repeat(100));
    const locationStats = {
      db: results.filter((r) => r.location === 'db').length,
      memory: results.filter((r) => r.location === 'memory').length,
      both: results.filter((r) => r.location === 'both').length
    };
    console.log(`  Только в БД: ${locationStats.db}`);
    console.log(`  Только в памяти: ${locationStats.memory}`);
    console.log(`  В БД и памяти: ${locationStats.both}`);
    console.log('-'.repeat(100) + '\n');

    // Детальная информация (первые 10 записей каждого типа)
    console.log('🔍 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ (примеры):\n');
    console.log('ОРГАНИЗАЦИИ:');
    byType.organization.slice(0, 5).forEach((org) => {
      console.log(`  ${org.name} (${org.id}):`);
      console.log(`    Расположение: ${org.location}`);
      console.log(`    Таблица БД: ${org.dbTable || 'N/A'}`);
      console.log(`    Ключ памяти: ${org.memoryKey || 'N/A'}`);
      console.log(`    Источник: ${org.source}`);
      console.log(`    Детали: ${org.details}`);
      console.log('');
    });

    console.log('ПРОЕКТЫ:');
    byType.project.slice(0, 5).forEach((project) => {
      console.log(`  ${project.name} (${project.id}):`);
      console.log(`    Расположение: ${project.location}`);
      console.log(`    Таблица БД: ${project.dbTable || 'N/A'}`);
      console.log(`    Ключ памяти: ${project.memoryKey || 'N/A'}`);
      console.log(`    Источник: ${project.source}`);
      console.log(`    Детали: ${project.details}`);
      console.log('');
    });

    console.log('ЗАДАЧИ:');
    byType.task.slice(0, 5).forEach((task) => {
      console.log(`  ${task.name} (${task.id}):`);
      console.log(`    Расположение: ${task.location}`);
      console.log(`    Таблица БД: ${task.dbTable || 'N/A'}`);
      console.log(`    Ключ памяти: ${task.memoryKey || 'N/A'}`);
      console.log(`    Источник: ${task.source}`);
      console.log(`    Детали: ${task.details}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Ошибка при аудите:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

auditData();

