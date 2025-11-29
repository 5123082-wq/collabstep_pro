import { sql } from '@vercel/postgres';
import type { Project, ProjectMember, Task, TaskComment } from '../types';
import { memory } from '../data/memory';

const LOG_PREFIX = '[pm-pg]';

const TABLE_PROJECTS = 'pm_projects';
const TABLE_PROJECT_MEMBERS = 'pm_project_members';
const TABLE_TASKS = 'pm_tasks';
const TABLE_TASK_COMMENTS = 'pm_task_comments';

const tablesReady: { ensured: boolean } = { ensured: false };
let hydrated = false;

export function isPmDbEnabled(): boolean {
  return process.env.USE_DB_STORAGE !== 'false' && Boolean(process.env.DATABASE_URL);
}

export async function ensurePmTables(): Promise<void> {
  if (!isPmDbEnabled() || tablesReady.ensured) {
    return;
  }

  await sql.query(`
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

  await sql.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_PROJECT_MEMBERS} (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id)
    );
  `);

  await sql.query(`
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

  await sql.query(`
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

  tablesReady.ensured = true;
  console.log(`${LOG_PREFIX} ensured tables`);
}

function mapProjectRow(row: Record<string, unknown>): Project {
  const project: Project = {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    key: String(row.key),
    title: String(row.title),
    description: String(row.description ?? ''),
    ownerId: String(row.owner_id),
    status: row.status as Project['status'],
    visibility: row.visibility as Project['visibility'],
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

export async function hydrateMemoryFromPg(): Promise<void> {
  if (!isPmDbEnabled() || hydrated) {
    return;
  }

  await ensurePmTables();

  const projectsRows = await sql.query(`SELECT * FROM ${TABLE_PROJECTS}`);
  const membersRows = await sql.query(`SELECT * FROM ${TABLE_PROJECT_MEMBERS}`);
  const tasksRows = await sql.query(`SELECT * FROM ${TABLE_TASKS}`);
  const commentsRows = await sql.query(`SELECT * FROM ${TABLE_TASK_COMMENTS}`);

  memory.PROJECTS = projectsRows.rows.map(mapProjectRow);
  memory.PROJECT_MEMBERS = {};
  for (const row of membersRows.rows) {
    const list = memory.PROJECT_MEMBERS[row.project_id] ?? [];
    list.push({ userId: row.user_id, role: row.role });
    memory.PROJECT_MEMBERS[row.project_id] = list;
  }
  memory.TASKS = tasksRows.rows.map(mapTaskRow);
  memory.TASK_COMMENTS = commentsRows.rows.map(mapCommentRow);

  hydrated = true;
  console.log(`${LOG_PREFIX} hydrated memory from Postgres (projects=${memory.PROJECTS.length}, tasks=${memory.TASKS.length}, comments=${memory.TASK_COMMENTS.length})`);
}

export async function persistProjectToPg(project: Project): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await sql.query(`
    INSERT INTO ${TABLE_PROJECTS} (
      id, workspace_id, key, title, description, owner_id, status, visibility,
      budget_planned, budget_spent, workflow_id, archived, stage, deadline, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    ON CONFLICT (id) DO UPDATE SET
      workspace_id = EXCLUDED.workspace_id,
      key = EXCLUDED.key,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      owner_id = EXCLUDED.owner_id,
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
    project.id, project.workspaceId, project.key, project.title, project.description ?? '',
    project.ownerId, project.status, project.visibility,
    project.budgetPlanned ?? null, project.budgetSpent ?? null, project.workflowId ?? null,
    project.archived ?? false, project.stage ?? null, project.deadline ?? null,
    project.createdAt, project.updatedAt
  ]);
}

export async function persistProjectMembersToPg(projectId: string, members: ProjectMember[]): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  if (members.length === 0) {
    await sql.query(`DELETE FROM ${TABLE_PROJECT_MEMBERS} WHERE project_id = $1`, [projectId]);
    return;
  }
  const values = members.map((_member, idx) => {
    const baseIdx = idx * 3;
    return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3})`;
  }).join(', ');
  const params = members.flatMap(member => [projectId, member.userId, member.role]);
  await sql.query(`
      INSERT INTO ${TABLE_PROJECT_MEMBERS} (project_id, user_id, role)
      VALUES ${values}
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    `, params);
}

export async function deleteProjectFromPg(projectId: string): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  await sql.query(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE project_id = $1`, [projectId]);
  await sql.query(`DELETE FROM ${TABLE_TASKS} WHERE project_id = $1`, [projectId]);
  await sql.query(`DELETE FROM ${TABLE_PROJECT_MEMBERS} WHERE project_id = $1`, [projectId]);
  await sql.query(`DELETE FROM ${TABLE_PROJECTS} WHERE id = $1`, [projectId]);
}

export async function persistTaskToPg(task: Task): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  const labelsJson = Array.isArray(task.labels) ? JSON.stringify(task.labels) : null;
  await sql.query(`
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
  await sql.query(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE task_id = $1`, [taskId]);
  await sql.query(`DELETE FROM ${TABLE_TASKS} WHERE id = $1`, [taskId]);
}

export async function persistCommentToPg(comment: TaskComment): Promise<void> {
  if (!isPmDbEnabled()) return;
  await ensurePmTables();
  const mentionsJson = JSON.stringify(comment.mentions ?? []);
  const attachmentsJson = JSON.stringify(comment.attachments ?? []);
  await sql.query(`
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
  await sql.query(`DELETE FROM ${TABLE_TASK_COMMENTS} WHERE id = $1`, [commentId]);
}

export async function fetchTaskByIdFromPg(taskId: string): Promise<Task | null> {
  if (!isPmDbEnabled()) return null;
  await ensurePmTables();
  const result = await sql.query(`SELECT * FROM ${TABLE_TASKS} WHERE id = $1 LIMIT 1`, [taskId]);
  const row = result.rows[0];
  return row ? mapTaskRow(row) : null;
}

export async function fetchCommentsByTaskFromPg(projectId: string, taskId: string): Promise<TaskComment[]> {
  if (!isPmDbEnabled()) return [];
  await ensurePmTables();
  const result = await sql.query(`
    SELECT * FROM ${TABLE_TASK_COMMENTS}
    WHERE project_id = $1 AND task_id = $2
  `, [projectId, taskId]);
  return result.rows.map(mapCommentRow);
}
