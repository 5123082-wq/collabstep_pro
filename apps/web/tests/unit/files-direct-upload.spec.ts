import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  projectsRepository,
  tasksRepository,
  resetFinanceMemory,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import {
  attachments,
  files,
  folders,
  organizationMembers,
  organizations,
  organizationStorageUsage,
  projects,
  users
} from '@collabverse/api/db/schema';
import { POST as getUploadUrl } from '@/app/api/files/upload-url/route';
import { POST as completeUpload } from '@/app/api/files/complete/route';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { and, eq } from 'drizzle-orm';

// Мокаем generateClientTokenFromReadWriteToken
jest.mock('@vercel/blob/client', () => ({
  generateClientTokenFromReadWriteToken: jest.fn()
}));

describe('Direct Upload API', () => {
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

  beforeAll(() => {
    process.env.FEATURE_PROJECT_ATTACHMENTS = 'true';
  });

  beforeEach(async () => {
    resetFinanceMemory();

    await db.delete(attachments);
    await db.delete(files);
    await db.delete(folders);
    await db.delete(organizationStorageUsage);
    await db.delete(projects);
    await db.delete(organizationMembers);
    await db.delete(organizations);
    await db.delete(users);

    // Создаем пользователя и организацию в БД
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

    // Создаем проект в памяти + в БД
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

  describe('POST /api/files/upload-url', () => {
    // Мокируем BLOB_READ_WRITE_TOKEN для тестов
    const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const mockGenerateToken = generateClientTokenFromReadWriteToken as jest.MockedFunction<
      typeof generateClientTokenFromReadWriteToken
    >;

    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
      // Мокаем генерацию токена - возвращаем валидный формат токена
      mockGenerateToken.mockResolvedValue('mock-client-token-12345');
    });

    afterEach(() => {
      mockGenerateToken.mockReset();
    });

    afterAll(() => {
      if (originalBlobToken) {
        process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
      } else {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      }
    });

    it('should return signed upload token for authorized user', async () => {
      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            projectId,
            entityType: 'project'
          })
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.token).toBe('mock-client-token-12345');
      expect(typeof data.data.token).toBe('string');
      expect(data.data.pathname).toContain(`projects/${projectId}/`);
      expect(data.data.storageKey).toContain(`projects/${projectId}/`);
      expect(data.data.storageKey).toBe(data.data.pathname);

      // Проверяем, что generateClientTokenFromReadWriteToken был вызван с правильными параметрами
      expect(mockGenerateToken).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateToken.mock.calls[0]![0];
      expect(callArgs.pathname).toContain(`projects/${projectId}/`);
      expect(callArgs.allowedContentTypes).toEqual(['text/plain']);
      expect(callArgs.maximumSizeInBytes).toBe(100);
      expect(callArgs.onUploadCompleted).toBeUndefined(); // Не должно быть callback
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            projectId
          })
        })
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            projectId: 'non-existent'
          })
        })
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 if payload is invalid', async () => {
      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            // missing required fields
            filename: 'test.txt'
          })
        })
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/files/complete', () => {
    it('should create FileObject and Attachment after upload with valid blob URL', async () => {
      const blobUrl = 'https://example.blob.vercel-storage.com/test.txt';
      const storageKey = `projects/${projectId}/test-file-id-test.txt`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey,
            url: blobUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.data.file).toBeDefined();
      expect(data.data.file.filename).toBe('test.txt');
      expect(data.data.file.storageUrl).toBe(blobUrl);
      expect(data.data.attachment).toBeDefined();
      expect(data.data.attachment.projectId).toBe(projectId);
      expect(data.data.attachment.linkedEntity).toBe('project');

      // Проверяем, что файл и attachment созданы в БД
      const [dbFile] = await db
        .select()
        .from(files)
        .where(eq(files.id, data.data.file.id));
      expect(dbFile).toBeDefined();

      const [dbAttachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.fileId, data.data.file.id));
      expect(dbAttachment).toBeDefined();
      expect(dbAttachment!.projectId).toBe(projectId);
    });

    it('should reject non-blob URLs', async () => {
      const externalUrl = 'https://example.com/test.txt';
      const storageKey = `projects/${projectId}/test-file-id-test.txt`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey,
            url: externalUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe('INVALID_BLOB_URL');
    });

    it('should reject invalid storageKey format', async () => {
      const blobUrl = 'https://example.blob.vercel-storage.com/test.txt';
      const invalidStorageKey = 'invalid/path/test.txt';

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey: invalidStorageKey,
            url: blobUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe('INVALID_STORAGE_KEY');
    });

    it('should reject storageKey for different project', async () => {
      const blobUrl = 'https://example.blob.vercel-storage.com/test.txt';
      const wrongStorageKey = `projects/different-project-id/test-file-id-test.txt`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey: wrongStorageKey,
            url: blobUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe('INVALID_STORAGE_KEY');
    });

    it('should reject when url.pathname does not match storageKey', async () => {
      const blobUrl = 'https://example.blob.vercel-storage.com/different/path/file.txt';
      const storageKey = `projects/${projectId}/test-file-id-test.txt`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey,
            url: blobUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe('PATHNAME_MISMATCH');
    });

    it('should accept when url.pathname matches storageKey', async () => {
      const storageKey = `projects/${projectId}/test-file-id-test.txt`;
      const blobUrl = `https://example.blob.vercel-storage.com/${storageKey}`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey,
            url: blobUrl,
            projectId,
            entityType: 'project',
            entityId: null,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.data.file).toBeDefined();
      expect(data.data.file.storageUrl).toBe(blobUrl);
    });

    it('should create project/task folders when uploading task file', async () => {
      const task = tasksRepository.create({
        projectId,
        title: 'Design Logo',
        status: 'new'
      });
      const storageKey = `projects/${projectId}/task-file.txt`;
      const blobUrl = `https://example.blob.vercel-storage.com/${storageKey}`;

      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey,
            url: blobUrl,
            projectId,
            entityType: 'task',
            entityId: task.id,
            filename: 'task-file.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);

      const [projectFolder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.projectId, projectId), eq(folders.type, 'project')));
      expect(projectFolder).toBeDefined();
      expect(projectFolder!.name).toBe(`Test Project (${projectId})`);

      const [taskFolder] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.taskId, task.id), eq(folders.type, 'task')));
      expect(taskFolder).toBeDefined();
      expect(taskFolder!.name).toBe(`Design Logo (${task.id})`);

      const [dbFile] = await db
        .select()
        .from(files)
        .where(eq(files.id, data.data.file.id));
      expect(dbFile).toBeDefined();
      expect(dbFile!.folderId).toBe(taskFolder!.id);
      expect(dbFile!.taskId).toBe(task.id);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey: 'test',
            url: 'https://example.com/test.txt',
            projectId,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: userId
          })
        })
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 if uploaderId does not match auth user', async () => {
      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            storageKey: 'test',
            url: 'https://example.com/test.txt',
            projectId,
            filename: 'test.txt',
            mimeType: 'text/plain',
            sizeBytes: 100,
            uploaderId: 'different-user-id'
          })
        })
      );

      expect(response.status).toBe(403);
    });

    it('should return 400 if payload is invalid', async () => {
      const response = await completeUpload(
        new NextRequest('http://localhost/api/files/complete', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            // missing required fields
            filename: 'test.txt'
          })
        })
      );

      expect(response.status).toBe(400);
    });
  });
});
