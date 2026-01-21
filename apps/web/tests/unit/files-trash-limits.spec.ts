import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  organizationsRepository,
  projectsRepository,
  resetFinanceMemory,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { db } from '@collabverse/api/db/config';
import {
  fileTrash,
  files,
  organizationMembers,
  organizationStorageUsage,
  organizationSubscriptions,
  organizations,
  projects,
  subscriptionPlans,
  users
} from '@collabverse/api/db/schema';
import { DELETE as deleteFile } from '@/app/api/files/[id]/route';
import { POST as restoreFile } from '@/app/api/files/[id]/restore/route';
import { GET as listTrash } from '@/app/api/files/trash/route';
import { POST as getUploadUrl } from '@/app/api/files/upload-url/route';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { resetTestDb } from './utils/db-cleaner';

describe('File limits and trash', () => {
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
    process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
  });

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

    if (process.env.AUTH_STORAGE !== 'db') {
      await organizationsRepository.create({
        id: organizationId,
        ownerId: userId,
        name: 'Test Org',
        type: 'closed',
        kind: 'business',
        isPublicInDirectory: false
      });
    }

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
    it('should reject when file size exceeds plan limit', async () => {
      const [plan] = await db
        .insert(subscriptionPlans)
        .values({
          code: 'free',
          name: 'Free',
          fileSizeLimitBytes: 10,
          storageLimitBytes: 1000,
          trashRetentionDays: 7
        })
        .returning();

      await db
        .insert(organizationSubscriptions)
        .values({
          organizationId,
          planId: plan!.id,
          status: 'active',
          startsAt: new Date()
        });

      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            filename: 'big.txt',
            mimeType: 'text/plain',
            sizeBytes: 11,
            projectId
          })
        })
      );

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toBe('FILE_SIZE_EXCEEDED');
    });

    it('should reject when storage limit would be exceeded', async () => {
      const [plan] = await db
        .insert(subscriptionPlans)
        .values({
          code: 'free',
          name: 'Free',
          fileSizeLimitBytes: 1000,
          storageLimitBytes: 100,
          trashRetentionDays: 7
        })
        .returning();

      await db
        .insert(organizationSubscriptions)
        .values({
          organizationId,
          planId: plan!.id,
          status: 'active',
          startsAt: new Date()
        });

      await db
        .insert(organizationStorageUsage)
        .values({
          organizationId,
          totalBytes: 95,
          fileCount: 1,
          lastCalculatedAt: new Date()
        });

      const response = await getUploadUrl(
        new NextRequest('http://localhost/api/files/upload-url', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            filename: 'another.txt',
            mimeType: 'text/plain',
            sizeBytes: 10,
            projectId
          })
        })
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('STORAGE_LIMIT_EXCEEDED');
    });
  });

  describe('Trash flow', () => {
    it('should move file to trash and restore it', async () => {
      const [plan] = await db
        .insert(subscriptionPlans)
        .values({
          code: 'free',
          name: 'Free',
          fileSizeLimitBytes: 1000,
          storageLimitBytes: 1000,
          trashRetentionDays: 7
        })
        .returning();

      await db
        .insert(organizationSubscriptions)
        .values({
          organizationId,
          planId: plan!.id,
          status: 'active',
          startsAt: new Date()
        });

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

      const deleteResponse = await deleteFile(
        new NextRequest(`http://localhost/api/files/${createdFile!.id}`, {
          method: 'DELETE',
          headers
        }),
        { params: { id: createdFile!.id } }
      );
      expect(deleteResponse.status).toBe(200);

      const [trashEntry] = await db
        .select()
        .from(fileTrash)
        .where(eq(fileTrash.fileId, createdFile!.id));

      expect(trashEntry).toBeDefined();
      expect(trashEntry!.expiresAt).toBeTruthy();

      const restoreResponse = await restoreFile(
        new NextRequest(`http://localhost/api/files/${createdFile!.id}/restore`, {
          method: 'POST',
          headers
        }),
        { params: { id: createdFile!.id } }
      );
      expect(restoreResponse.status).toBe(200);

      const [restoredEntry] = await db
        .select()
        .from(fileTrash)
        .where(eq(fileTrash.fileId, createdFile!.id));
      expect(restoredEntry?.restoredAt).toBeTruthy();
    });

    it('should list trash entries for organization', async () => {
      const [createdFile] = await db
        .insert(files)
        .values({
          organizationId,
          projectId,
          uploadedBy: userId,
          filename: 'trash.txt',
          mimeType: 'text/plain',
          sizeBytes: 100,
          storageKey: `projects/${projectId}/trash.txt`,
          storageUrl: 'https://example.blob.vercel-storage.com/trash.txt',
          sha256: null,
          description: null,
          folderId: null,
          taskId: null
        })
        .returning();

      await db
        .insert(fileTrash)
        .values({
          fileId: createdFile!.id,
          organizationId,
          deletedBy: userId,
          deletedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          retentionDays: 7
        });

      const response = await listTrash(
        new NextRequest(`http://localhost/api/files/trash?organizationId=${organizationId}`, {
          method: 'GET',
          headers
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.data.files.length).toBe(1);
      expect(data.data.files[0]?.id).toBe(createdFile!.id);
    });
  });
});
