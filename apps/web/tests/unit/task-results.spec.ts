import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  projectsRepository,
  tasksRepository,
  resetFinanceMemory,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import {
  files,
  folders,
  organizationMembers,
  organizations,
  projects,
  users
} from '@collabverse/api/db/schema';
import { GET as getTaskResults, POST as setTaskResults } from '@/app/api/pm/tasks/[id]/results/route';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { resetTestDb } from './utils/db-cleaner';

describe('Task Results API', () => {
  let projectId: string;
  let taskId: string;
  let organizationId: string;
  const adminEmail = 'admin.demo@collabverse.test';
  const userId = TEST_ADMIN_USER_ID;
  const session = encodeDemoSession({
    email: adminEmail,
    userId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`
  };

  beforeEach(async () => {
    resetFinanceMemory();

    await resetTestDb();

    await db
      .insert(users)
      .values({
        id: userId,
        email: adminEmail,
        name: 'Test Admin'
      });

    organizationId = randomUUID();
    await db
      .insert(organizations)
      .values({
        id: organizationId,
        ownerId: userId,
        name: 'Test Org',
        type: 'closed',
        kind: 'business'
      });

    await db
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role: 'owner',
        status: 'active'
      });

    // Create project
    const project = projectsRepository.create({
      title: 'Test Project',
      description: 'Test Description',
      ownerId: userId,
      workspaceId: 'workspace-id',
      status: 'active'
    });
    projectId = project.id;

    await db
      .insert(projects)
      .values({
        id: projectId,
        organizationId,
        ownerId: userId,
        name: project.title,
        description: project.description
      });

    // Create task
    const task = tasksRepository.create({
      projectId,
      title: 'Test Task',
      status: 'new'
    });
    taskId = task.id;
  });

  describe('GET /api/pm/tasks/[id]/results', () => {
    it('should return empty array when no results exist', async () => {
      const response = await getTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toEqual([]);
    });

    it('should return files from result folder', async () => {
      // Create project folder
      const [projectFolder] = await db
        .insert(folders)
        .values({
          organizationId,
          projectId,
          name: 'Test Project',
          type: 'project',
          createdBy: userId
        })
        .returning();

      // Create task folder
      const [taskFolder] = await db
        .insert(folders)
        .values({
          organizationId,
          projectId,
          taskId,
          name: 'Test Task',
          type: 'task',
          createdBy: userId,
          parentId: projectFolder!.id
        })
        .returning();

      // Create result folder
      const [resultFolder] = await db
        .insert(folders)
        .values({
          organizationId,
          projectId,
          taskId,
          name: 'Result',
          type: 'result',
          createdBy: userId,
          parentId: taskFolder!.id
        })
        .returning();

      // Create file in result folder
      await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          taskId,
          uploadedBy: userId,
          filename: 'result.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/result.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/result.txt',
          folderId: resultFolder!.id
        });

      const response = await getTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(1);
      expect(data.data.files[0]!.filename).toBe('result.txt');
    });

    it('should return 404 if task not found', async () => {
      const response = await getTaskResults(
        new NextRequest('http://localhost/api/pm/tasks/non-existent/results', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'GET'
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pm/tasks/[id]/results', () => {
    it('should move files to result folder', async () => {
      // Create files
      const [file1] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'file1.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/file1.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/file1.txt',
          folderId: null,
          taskId: null
        })
        .returning();

      const [file2] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'file2.txt',
          mimeType: 'text/plain',
          sizeBytes: 200,
          storageKey: `projects/${projectId}/file2.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/file2.txt',
          folderId: null,
          taskId: null
        })
        .returning();

      const response = await setTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'POST',
          headers: {
            cookie: headers.cookie,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ fileIds: [file1!.id, file2!.id] })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(2);

      // Verify files are in result folder
      const [resultFolder] = await db
        .select()
        .from(folders)
        .where(
          and(
            eq(folders.taskId, taskId),
            eq(folders.type, 'result')
          )
        );

      expect(resultFolder).toBeDefined();

      const updatedFiles = await db
        .select()
        .from(files)
        .where(eq(files.folderId, resultFolder!.id));

      expect(updatedFiles).toHaveLength(2);
      expect(updatedFiles.every((f) => f.taskId === taskId)).toBe(true);
    });

    it('should return 400 if fileIds array is empty', async () => {
      const response = await setTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'POST',
          headers: {
            cookie: headers.cookie,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ fileIds: [] })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 if files do not belong to project', async () => {
      // Create file in different project
      const otherProjectId = randomUUID();
      await db
        .insert(projects)
        .values({
          id: otherProjectId,
          organizationId,
          ownerId: userId,
          name: 'Other Project'
        });

      const [otherFile] = await db
        .insert(files)
        .values({
          organizationId,
          projectId: otherProjectId,
          uploadedBy: userId,
          filename: 'other.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${otherProjectId}/other.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/other.txt'
        })
        .returning();

      const response = await setTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'POST',
          headers: {
            cookie: headers.cookie,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ fileIds: [otherFile!.id] })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(400);
    });

    it('should return 404 if task not found', async () => {
      const response = await setTaskResults(
        new NextRequest('http://localhost/api/pm/tasks/non-existent/results', {
          method: 'POST',
          headers: {
            cookie: headers.cookie,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ fileIds: ['file-id'] })
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await setTaskResults(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/results`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ fileIds: ['file-id'] })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(401);
    });
  });
});
