import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  projectsRepository,
  resetFinanceMemory,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import {
  attachments,
  files,
  organizationMembers,
  organizations,
  projects,
  users
} from '@collabverse/api/db/schema';
import { GET as getProjectFiles, POST as uploadFile } from '@/app/api/pm/projects/[id]/files/route';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { resetTestDb } from './utils/db-cleaner';

jest.mock('@vercel/blob', () => ({
  put: jest.fn()
}));

describe('Project Files API', () => {
  let projectId: string;
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

  const mockPut = put as jest.MockedFunction<typeof put>;

  beforeEach(async () => {
    resetFinanceMemory();

    await resetTestDb();

    process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
    mockPut.mockResolvedValue({
      url: 'https://example.blob.vercel-storage.com/test.txt',
      downloadUrl: 'https://example.blob.vercel-storage.com/test.txt?download=1',
      pathname: 'projects/test/test.txt',
      contentType: 'text/plain',
      contentDisposition: 'attachment; filename="test.txt"'
    });

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
        type: 'closed'
      });

    await db
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role: 'owner',
        status: 'active'
      });

    // Создаем проект для тестов
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
  });

  afterEach(() => {
    mockPut.mockReset();
  });

  describe('GET /api/pm/projects/[id]/files', () => {
    it('should return empty array when no files exist', async () => {
      const response = await getProjectFiles(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toEqual([]);
    });

    it('should return files for a project', async () => {
      const [createdFile] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'test.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/test.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/test.txt',
          sha256: null,
          description: null,
          folderId: null,
          taskId: null
        })
        .returning();

      await db
        .insert(attachments)
        .values({
          projectId,
          fileId: createdFile!.id,
          linkedEntity: 'project',
          entityId: null,
          createdBy: userId
        });

      const response = await getProjectFiles(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(1);
      expect(data.data.files[0]!.filename).toBe('test.txt');
      expect(data.data.files[0]!.source).toBe('project');
    });

    it('should filter files by source', async () => {
      // Создаем файлы из разных источников
      const [file1] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'project-file.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/project-file.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/project-file.txt',
          sha256: null,
          description: null,
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
          filename: 'task-file.txt',
          mimeType: 'text/plain',
          sizeBytes: 200,
          storageKey: `projects/${projectId}/task-file.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/task-file.txt',
          sha256: null,
          description: null,
          folderId: null,
          taskId: null
        })
        .returning();

      await db
        .insert(attachments)
        .values({
          projectId,
          fileId: file1!.id,
          linkedEntity: 'project',
          entityId: null,
          createdBy: userId
        });

      await db
        .insert(attachments)
        .values({
          projectId,
          fileId: file2!.id,
          linkedEntity: 'task',
          entityId: 'task-123',
          createdBy: userId
        });

      const response = await getProjectFiles(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files?source=project`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(1);
      expect(data.data.files[0]!.source).toBe('project');
    });

    it('should group files by source', async () => {
      // Создаем файлы из разных источников
      const [projectFile] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'project.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/project.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/project.txt',
          sha256: null,
          description: null,
          folderId: null,
          taskId: null
        })
        .returning();

      const [taskFile] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'task.txt',
          mimeType: 'text/plain',
          sizeBytes: 200,
          storageKey: `projects/${projectId}/task.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/task.txt',
          sha256: null,
          description: null,
          folderId: null,
          taskId: null
        })
        .returning();

      await db
        .insert(attachments)
        .values({
          projectId,
          fileId: projectFile!.id,
          linkedEntity: 'project',
          entityId: null,
          createdBy: userId
        });

      await db
        .insert(attachments)
        .values({
          projectId,
          fileId: taskFile!.id,
          linkedEntity: 'task',
          entityId: 'task-123',
          createdBy: userId
        });

      const response = await getProjectFiles(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(2);

      const sources = data.data.files.map((f: { source: string }) => f.source);
      expect(sources).toContain('project');
      expect(sources).toContain('tasks');
    });

    it('should return 404 if project not found', async () => {
      const response = await getProjectFiles(
        new NextRequest('http://localhost/api/pm/projects/non-existent/files', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getProjectFiles(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'GET'
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pm/projects/[id]/files', () => {
    it('should upload a file to project', async () => {
      const fileContent = 'Test file content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFile(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'POST',
          headers: { cookie: headers.cookie },
          body: formData
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.file.filename).toBe('test.txt');
      expect(data.data.file.source).toBe('project');
      expect(data.data.attachment).toBeDefined();
      expect(data.data.attachment.linkedEntity).toBe('project');
    });

    it('should return 400 if no file provided', async () => {
      const formData = new FormData();

      const response = await uploadFile(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'POST',
          headers: { cookie: headers.cookie },
          body: formData
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(400);
    });

    it('should return 404 if project not found', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFile(
        new NextRequest('http://localhost/api/pm/projects/non-existent/files', {
          method: 'POST',
          headers: { cookie: headers.cookie },
          body: formData
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFile(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'POST',
          body: formData
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(401);
    });

    it('should attach file to project', async () => {
      const fileContent = 'Test file content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFile(
        new NextRequest(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'POST',
          headers: { cookie: headers.cookie },
          body: formData
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // Проверяем, что attachment создан
      const [attachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.fileId, data.data.file.id));
      expect(attachment).toBeDefined();
      expect(attachment?.linkedEntity).toBe('project');
      expect(attachment?.projectId).toBe(projectId);
    });
  });
});
