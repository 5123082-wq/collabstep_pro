import { sql as vercelSql } from '@vercel/postgres';
import postgres from 'postgres';
import type { Project, ProjectChatMessage, ProjectMember, Task, TaskComment } from '../types';
import { memory } from '../data/memory';

const LOG_PREFIX = '[pm-pg]';
const LOCAL_PG_REGEX = /^postgres(?:ql)?:\/\/(localhost|127\.0\.0\.1)/;
const shouldUseLocalPg =
  process.env.USE_LOCAL_PG === 'true' ||
  (!!process.env.POSTGRES_URL && LOCAL_PG_REGEX.test(process.env.POSTGRES_URL ?? ''));
const sqlClient = shouldUseLocalPg && process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'prefer' })
  : vercelSql;

function hasQuery(
  client: typeof vercelSql | ReturnType<typeof postgres>
): client is typeof vercelSql {
  return typeof (client as typeof vercelSql).query === 'function';
}

async function runQuery(
  text: string,
  params?: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  if (hasQuery(sqlClient)) {
    return sqlClient.query(text, params as unknown[]);
  }

  // postgres-js unsafe() requires specific parameter types that don't match unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (sqlClient as ReturnType<typeof postgres>).unsafe(
    text,
    (params ?? []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  );
  return { rows };
}

const TABLE_PROJECTS = 'pm_projects';
const TABLE_PROJECT_MEMBERS = 'pm_project_members';
const TABLE_TASKS = 'pm_tasks';
const TABLE_TASK_COMMENTS = 'pm_task_comments';
const TABLE_PROJECT_CHAT_MESSAGES = 'pm_project_chat_messages';

const tablesReady: { ensured: boolean } = { ensured: false };
let hydrated = false;

const ALLOWED_PROJECT_STATUSES: Project['status'][] = ['active', 'on_hold', 'completed', 'archived'];

function normalizeProjectStatus(rawStatus: unknown): Project['status'] {
  if (typeof rawStatus === 'string' && ALLOWED_PROJECT_STATUSES.includes(rawStatus as Project['status'])) {
    return rawStatus as Project['status'];
  }
  return 'active';
}

function normalizeProjectVisibility(rawVisibility: unknown): Project['visibility'] {
  return rawVisibility === 'public' ? 'public' : 'private';
}

export function isPmDbEnabled(): boolean {
  return process.env.USE_DB_STORAGE !== 'false' && Boolean(process.env.DATABASE_URL);
}

export async function ensurePmTables(): Promise<void> {
  if (!isPmDbEnabled() || tablesReady.ensured) {
    return;
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TABLE_PROJECTS} (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      budget_planned NUMERIC,
      budget_spent NUMERIC,
      workflow_id TEXT,
      archived BOOLEAN DEFAULT FALSE,
      stage TEXT,
      deadline TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Ensure new columns are present for existing installations
  await runQuery(`ALTER TABLE ${TABLE_PROJECTS} ADD COLUMN IF NOT EXISTS owner_number INTEGER`);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TABLE_PROJECT_MEMBERS} (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id)
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TABLE_TASKS} (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      iteration_id TEXT,
      assignee_id TEXT,
      start_at TEXT,
      start_date TEXT,
      due_at TEXT,
      priority TEXT,
      labels JSONB,
      estimated_time INTEGER,
      story_points INTEGER,
      logged_time INTEGER,
      price TEXT,
      currency TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TABLE_TASK_COMMENTS} (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      parent_id TEXT,
      body TEXT NOT NULL,
      mentions JSONB DEFAULT '[]',
      attachments JSONB DEFAULT '[]',
      author_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TABLE_PROJECT_CHAT_MESSAGES} (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      body TEXT NOT NULL,
      attachments JSONB DEFAULT '[]',
      author_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  tablesReady.ensured = true;
  console.log(`${LOG_PREFIX} ensured tables`);
}

function mapProjectRow(row: Record<string, unknown>): Project {
  const ownerNumber = row.owner_number !== null && row.owner_number !== undefined ? Number(row.owner_number) : undefined;
  const project: Project = {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    key: String(row.key),
    title: String(row.title),
    description: String(row.description ?? ''),
    ownerId: String(row.owner_id),
    ...(ownerNumber !== undefined && { ownerNumber }),
    status: normalizeProjectStatus(row.status),
    visibility: normalizeProjectVisibility(row.visibility),
    budgetPlanned: row.budget_planned !== null && row.budget_planned !== undefined ? Number(row.budget_planned) : null,
    budgetSpent: row.budget_spent !== null && row.budget_spent !== undefined ? Number(row.budget_spent) : null,
    workflowId: String(row.workflow_id ?? `wf-${row.id}`),
    archived: Boolean(row.archived),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
  
  const validStages: Project['stage'][] = ['discovery', 'design', 'build', 'launch', 'support'];
  const stageValue = row.stage && typeof row.stage === 'string' && validStages.includes(row.stage as Project['stage'])
    ? row.stage as Project['stage']
    : undefined;
  const deadlineValue = row.deadline && typeof row.deadline === 'string' ? String(row.deadline) : undefined;
  
  return {
    ...project,
    ...(stageValue ? { stage: stageValue } : {}),
    ...(deadlineValue ? { deadline: deadlineValue } : {})
  };
}

function mapTaskRow(row: Record<string, unknown>): Task {
  const labelsValue = row.labels;
  const labels: string[] | undefined = Array.isArray(labelsValue) && labelsValue.length > 0 
    ? labelsValue as string[] 
    : undefined;
  const task: Task = {
    id: String(row.id),
    projectId: String(row.project_id),
    number: Number(row.number),
    parentId: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title),
    description: String(row.description ?? ''),
    status: row.status as Task['status'],
    estimatedTime: row.estimated_time !== null && row.estimated_time !== undefined ? Number(row.estimated_time) : null,
    storyPoints: row.story_points !== null && row.story_points !== undefined ? Number(row.story_points) : null,
    loggedTime: row.logged_time !== null && row.logged_time !== undefined ? Number(row.logged_time) : null,
    price: row.price ? String(row.price) : null,
    currency: row.currency ? String(row.currency) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
  
  if (row.iteration_id) task.iterationId = String(row.iteration_id);
  if (row.assignee_id) task.assigneeId = String(row.assignee_id);
  if (row.start_at) task.startAt = String(row.start_at);
  if (row.start_date) task.startDate = String(row.start_date);
  if (row.due_at) task.dueAt = String(row.due_at);
  if (row.priority && (row.priority === 'low' || row.priority === 'med' || row.priority === 'high' || row.priority === 'urgent')) {
    task.priority = row.priority;
  }
  if (labels) task.labels = labels;
  
  return task;
}

function mapCommentRow(row: Record<string, unknown>): TaskComment {
  const mentionsRaw = row.mentions;
  const attachmentsRaw = row.attachments;
  const mentions = Array.isArray(mentionsRaw) ? mentionsRaw : [];
  const attachments = Array.isArray(attachmentsRaw) ? attachmentsRaw : [];
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    taskId: String(row.task_id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    body: String(row.body ?? ''),
    mentions,
    attachments,
    authorId: String(row.author_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

function mapChatMessageRow(row: Record<string, unknown>): ProjectChatMessage {
  const attachmentsRaw = row.attachments;
  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((item) => String(item))
    : [];
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    body: String(row.body ?? ''),
    attachments,
    authorId: String(row.author_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

export async function hydrateMemoryFromPg(): Promise<void> {
  if (!isPmDbEnabled() || hydrated) {
    return;
  }

  await ensurePmTables();

  const projectsRows = await runQuery(`SELECT * FROM ${TABLE_PROJECTS}`);
  const membersRows = await runQuery(`SELECT * FROM ${TABLE_PROJECT_MEMBERS}`);
  const tasksRows = await runQuery(`SELECT * FROM ${TABLE_TASKS}`);
  const commentsRows = await runQuery(`SELECT * FROM ${TABLE_TASK_COMMENTS}`);
  const chatRows = await runQuery(`SELECT * FROM ${TABLE_PROJECT_CHAT_MESSAGES}`);

  memory.PROJECTS = projectsRows.rows.map(mapProjectRow);
  memory.PROJECT_MEMBERS = {};
  for (const row of membersRows.rows) {
    const projectId = String(row.project_id);
    const list = memory.PROJECT_MEMBERS[projectId] ?? [];
    const role = String(row.role);
    // Validate role type
    if (role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer') {
      list.push({ userId: String(row.user_id), role });
      memory.PROJECT_MEMBERS[projectId] = list;
    }
  }
  memory.TASKS = tasksRows.rows.map(mapTaskRow);
  memory.TASK_COMMENTS = commentsRows.rows.map(mapCommentRow);
  memory.PROJECT_CHAT_MESSAGES = chatRows.rows.map(mapChatMessageRow);

  hydrated = true;
  console.log(
    `${LOG_PREFIX} hydrated memory from Postgres (projects=${memory.PROJECTS.length}, tasks=${memory.TASKS.length}, comments=${memory.TASK_COMMENTS.length}, chatMessages=${memory.PROJECT_CHAT_MESSAGES.length})`
  );
}

export async function persistProjectToPg(project: Project): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await runQuery(`
    INSERT INTO ${TABLE_PROJECTS} (
      id, workspace_id, key, title, description, owner_id, owner_number, status, visibility,
      budget_planned, budget_spent, workflow_id, archived, stage, deadline, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    ON CONFLICT (id) DO UPDATE SET
      workspace_id = EXCLUDED.workspace_id,
      key = EXCLUDED.key,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      owner_id = EXCLUDED.owner_id,
      owner_number = EXCLUDED.owner_number,
      status = EXCLUDED.status,
      visibility = EXCLUDED.visibility,
      budget_planned = EXCLUDED.budget_planned,
      budget_spent = EXCLUDED.budget_spent,
      workflow_id = EXCLUDED.workflow_id,
      archived = EXCLUDED.archived,
      stage = EXCLUDED.stage,
      deadline = EXCLUDED.deadline,
      updated_at = EXCLUDED.updated_at;
  `, [
    project.id,
    project.workspaceId,
    project.key,
    project.title,
    project.description ?? '',
    project.ownerId,
    project.ownerNumber ?? null,
    project.status,
    project.visibility,
    project.budgetPlanned ?? null,
    project.budgetSpent ?? null,
    project.workflowId ?? null,
    project.archived ?? false,
    project.stage ?? null,
    project.deadline ?? null,
    project.createdAt,
    project.updatedAt
  ]);
}

export async function persistProjectMembersToPg(projectId: string, members: ProjectMember[]): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  if (members.length === 0) {
    await runQuery(`DELETE FROM ${TABLE_PROJECT_MEMBERS} WHERE project_id = $1`, [projectId]);
    return;
  }
  const values = members.map((_member, idx) => {
    const baseIdx = idx * 3;
    return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3})`;
  }).join(', ');
  const params = members.flatMap(member => [projectId, member.userId, member.role]);
  await runQuery(`
      INSERT INTO ${TABLE_PROJECT_MEMBERS} (project_id, user_id, role)
      VALUES ${values}
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    `, params);
}

export async function deleteProjectFromPg(projectId: string): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await runQuery(`DELETE FROM ${TABLE_PROJECT_CHAT_MESSAGES} WHERE project_id = $1`, [projectId]);
  await runQuery(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE project_id = $1`, [projectId]);
  await runQuery(`DELETE FROM ${TABLE_TASKS} WHERE project_id = $1`, [projectId]);
  await runQuery(`DELETE FROM ${TABLE_PROJECT_MEMBERS} WHERE project_id = $1`, [projectId]);
  await runQuery(`DELETE FROM ${TABLE_PROJECTS} WHERE id = $1`, [projectId]);
}

export async function persistTaskToPg(task: Task): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  const labelsJson = Array.isArray(task.labels) ? JSON.stringify(task.labels) : null;
  await runQuery(`
    INSERT INTO ${TABLE_TASKS} (
      id, project_id, number, parent_id, title, description, status, iteration_id,
      assignee_id, start_at, start_date, due_at, priority, labels,
      estimated_time, story_points, logged_time, price, currency, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb,
      $15, $16, $17, $18, $19, $20, $21
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      number = EXCLUDED.number,
      parent_id = EXCLUDED.parent_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      iteration_id = EXCLUDED.iteration_id,
      assignee_id = EXCLUDED.assignee_id,
      start_at = EXCLUDED.start_at,
      start_date = EXCLUDED.start_date,
      due_at = EXCLUDED.due_at,
      priority = EXCLUDED.priority,
      labels = EXCLUDED.labels,
      estimated_time = EXCLUDED.estimated_time,
      story_points = EXCLUDED.story_points,
      logged_time = EXCLUDED.logged_time,
      price = EXCLUDED.price,
      currency = EXCLUDED.currency,
      updated_at = EXCLUDED.updated_at;
  `, [
    task.id, task.projectId, task.number, task.parentId ?? null, task.title,
    task.description ?? '', task.status, task.iterationId ?? null,
    task.assigneeId ?? null, task.startAt ?? null, task.startDate ?? null,
    task.dueAt ?? null, task.priority ?? null, labelsJson,
    task.estimatedTime ?? null, task.storyPoints ?? null, task.loggedTime ?? null,
    task.price ?? null, task.currency ?? null, task.createdAt, task.updatedAt
  ]);
}

export async function deleteTaskFromPg(taskId: string): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await runQuery(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE task_id = $1`, [taskId]);
  await runQuery(`DELETE FROM ${TABLE_TASKS} WHERE id = $1`, [taskId]);
}

export async function persistCommentToPg(comment: TaskComment): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  const mentionsJson = JSON.stringify(comment.mentions ?? []);
  const attachmentsJson = JSON.stringify(comment.attachments ?? []);
  await runQuery(`
    INSERT INTO ${TABLE_TASK_COMMENTS} (
      id, project_id, task_id, parent_id, body, mentions, attachments, author_id, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      task_id = EXCLUDED.task_id,
      parent_id = EXCLUDED.parent_id,
      body = EXCLUDED.body,
      mentions = EXCLUDED.mentions,
      attachments = EXCLUDED.attachments,
      author_id = EXCLUDED.author_id,
      updated_at = EXCLUDED.updated_at;
  `, [
    comment.id, comment.projectId, comment.taskId, comment.parentId ?? null,
    comment.body, mentionsJson, attachmentsJson,
    comment.authorId, comment.createdAt, comment.updatedAt
  ]);
}

export async function deleteCommentFromPg(commentId: string): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await runQuery(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE id = $1`, [commentId]);
}

export async function fetchTaskByIdFromPg(taskId: string): Promise<Task | null> {
  if (!isPmDbEnabled()) return null;
  await ensurePmTables();
  const result = await runQuery(`SELECT * FROM ${TABLE_TASKS} WHERE id = $1 LIMIT 1`, [taskId]);
  const row = result.rows[0];
  return row ? mapTaskRow(row) : null;
}

export async function fetchProjectsFromPg(options: { archived?: boolean | null; workspaceId?: string | null } = {}): Promise<Project[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  
  let query = `SELECT * FROM ${TABLE_PROJECTS}`;
  const params: unknown[] = [];
  const conditions: string[] = [];
  
  if (options.archived !== null && options.archived !== undefined) {
    conditions.push(`archived = $${params.length + 1}`);
    params.push(options.archived);
  }
  
  if (options.workspaceId) {
    conditions.push(`workspace_id = $${params.length + 1}`);
    params.push(options.workspaceId);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const result = await runQuery(query, params);
  return result.rows.map(mapProjectRow);
}

export async function fetchProjectByIdFromPg(projectId: string): Promise<Project | null> {
  if (!isPmDbEnabled()) return null;
  await ensurePmTables();
  const result = await runQuery(`SELECT * FROM ${TABLE_PROJECTS} WHERE id = $1 LIMIT 1`, [projectId]);
  const row = result.rows[0];
  return row ? mapProjectRow(row) : null;
}

export async function fetchProjectByKeyFromPg(workspaceId: string, key: string): Promise<Project | null> {
  if (!isPmDbEnabled()) return null;
  await ensurePmTables();
  const result = await runQuery(
    `SELECT * FROM ${TABLE_PROJECTS} WHERE workspace_id = $1 AND key = $2 LIMIT 1`,
    [workspaceId, key.toUpperCase()]
  );
  const row = result.rows[0];
  return row ? mapProjectRow(row) : null;
}

export async function fetchProjectMembersFromPg(projectId: string): Promise<ProjectMember[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  const result = await runQuery(
    `SELECT * FROM ${TABLE_PROJECT_MEMBERS} WHERE project_id = $1`,
    [projectId]
  );
  return result.rows.map((row) => ({
    userId: String(row.user_id),
    role: String(row.role) as ProjectMember['role']
  }));
}

export async function fetchTasksFromPg(options: { projectId?: string; status?: string; iterationId?: string } = {}): Promise<Task[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  
  let query = `SELECT * FROM ${TABLE_TASKS}`;
  const params: unknown[] = [];
  const conditions: string[] = [];
  
  if (options.projectId) {
    conditions.push(`project_id = $${params.length + 1}`);
    params.push(options.projectId);
  }
  
  if (options.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(options.status);
  }
  
  if (options.iterationId) {
    conditions.push(`iteration_id = $${params.length + 1}`);
    params.push(options.iterationId);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY number ASC, created_at ASC`;
  
  const result = await runQuery(query, params);
  return result.rows.map(mapTaskRow);
}

export async function fetchCommentsByTaskFromPg(projectId: string, taskId: string): Promise<TaskComment[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  const result = await runQuery(`
    SELECT * FROM ${TABLE_TASK_COMMENTS}
    WHERE project_id = $1 AND task_id = $2
  `, [projectId, taskId]);
  return result.rows.map(mapCommentRow);
}

export async function persistChatMessageToPg(message: ProjectChatMessage): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  const attachmentsJson = JSON.stringify(message.attachments ?? []);
  await runQuery(
    `
    INSERT INTO ${TABLE_PROJECT_CHAT_MESSAGES} (
      id, project_id, body, attachments, author_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      body = EXCLUDED.body,
      attachments = EXCLUDED.attachments,
      author_id = EXCLUDED.author_id,
      updated_at = EXCLUDED.updated_at;
  `,
    [
      message.id,
      message.projectId,
      message.body,
      attachmentsJson,
      message.authorId,
      message.createdAt,
      message.updatedAt
    ]
  );
}

export async function deleteChatMessageFromPg(messageId: string): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await runQuery(`DELETE FROM ${TABLE_PROJECT_CHAT_MESSAGES} WHERE id = $1`, [messageId]);
}

export async function fetchChatMessagesByProjectFromPg(
  projectId: string
): Promise<ProjectChatMessage[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  const result = await runQuery(
    `SELECT * FROM ${TABLE_PROJECT_CHAT_MESSAGES} WHERE project_id = $1`,
    [projectId]
  );
  return result.rows.map(mapChatMessageRow);
}

export async function fetchChatMessageByIdFromPg(
  messageId: string
): Promise<ProjectChatMessage | null> {
  if (!isPmDbEnabled()) return null;
  await ensurePmTables();
  const result = await runQuery(
    `SELECT * FROM ${TABLE_PROJECT_CHAT_MESSAGES} WHERE id = $1 LIMIT 1`,
    [messageId]
  );
  const row = result.rows[0];
  return row ? mapChatMessageRow(row) : null;
}
