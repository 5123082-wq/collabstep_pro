import { encodeDemoSession } from '@/lib/auth/demo-session';
import { organizationsRepository, memory, resetFinanceMemory, TEST_ADMIN_USER_ID } from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import { organizationMembers, organizations, users } from '@collabverse/api/db/schema';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { resetTestDb } from './utils/db-cleaner';

const FEATURE_PM_NAV_KEY = 'NEXT_PUBLIC_FEATURE_PM_NAV_PROJECTS_AND_TASKS';
const FEATURE_PM_LIST_KEY = 'NEXT_PUBLIC_FEATURE_PM_PROJECTS_LIST';

const ORIGINAL_ENV = {
  [FEATURE_PM_NAV_KEY]: process.env[FEATURE_PM_NAV_KEY],
  [FEATURE_PM_LIST_KEY]: process.env[FEATURE_PM_LIST_KEY]
};

const adminEmail = 'admin.demo@collabverse.test';
const userId = TEST_ADMIN_USER_ID;
const session = encodeDemoSession({
  email: adminEmail,
  userId,
  role: 'admin',
  issuedAt: Date.now()
});

const headers = {
  cookie: `cv_session=${session}`,
  'content-type': 'application/json'
};

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }
  Reflect.set(process.env, key, value);
}

async function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/pm/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

describe('POST /api/pm/projects', () => {
  let organizationId: string;
  let createProject: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    setEnv(FEATURE_PM_NAV_KEY, 'true');
    setEnv(FEATURE_PM_LIST_KEY, 'true');
    jest.resetModules();
    ({ POST: createProject } = await import('@/app/api/pm/projects/route'));
  });

  afterAll(() => {
    setEnv(FEATURE_PM_NAV_KEY, ORIGINAL_ENV[FEATURE_PM_NAV_KEY]);
    setEnv(FEATURE_PM_LIST_KEY, ORIGINAL_ENV[FEATURE_PM_LIST_KEY]);
  });

  beforeEach(async () => {
    resetFinanceMemory();
    memory.PROJECTS = [];

    await resetTestDb();

    await db.insert(users).values({
      id: userId,
      email: adminEmail,
      name: 'Test Admin'
    });

    organizationId = randomUUID();
    await db.insert(organizations).values({
      id: organizationId,
      ownerId: userId,
      name: 'Test Org',
      type: 'closed',
      isPublicInDirectory: false
    });

    await db.insert(organizationMembers).values({
      organizationId,
      userId,
      role: 'owner',
      status: 'active'
    });

    await organizationsRepository.create({
      id: organizationId,
      ownerId: userId,
      name: 'Test Org',
      type: 'closed',
      isPublicInDirectory: false
    });
  });

  it('rejects invalid project type', async () => {
    const response = await createProject(await buildRequest({
      name: 'Bad Type Project',
      organizationId,
      type: 'invalid-type'
    }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('INVALID_REQUEST');
  });

  it('rejects invalid project stage', async () => {
    const response = await createProject(await buildRequest({
      name: 'Bad Stage Project',
      organizationId,
      stage: 'invalid-stage'
    }));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('INVALID_REQUEST');
  });

  it('creates project with defaults when optional fields are missing', async () => {
    const response = await createProject(await buildRequest({
      name: 'Default Project',
      organizationId
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    const project = payload.data.project;

    expect(project.visibility).toBe('private');
    expect(project.stage).toBe('discovery');
    expect(project.type).toBeUndefined();
    expect(project.deadline).toBeUndefined();
  });

  it('creates project with explicit settings', async () => {
    const response = await createProject(await buildRequest({
      name: 'Configured Project',
      organizationId,
      visibility: 'public',
      type: 'marketing',
      stage: 'build',
      deadline: '2025-01-15'
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    const project = payload.data.project;

    expect(project.visibility).toBe('public');
    expect(project.type).toBe('marketing');
    expect(project.stage).toBe('build');
    expect(project.deadline).toBe('2025-01-15');
  });
});
