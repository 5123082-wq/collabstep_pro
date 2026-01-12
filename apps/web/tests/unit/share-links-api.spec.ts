import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  sharesRepository,
  TEST_ADMIN_USER_ID
} from '@collabverse/api';
import { POST as createShare } from '@/app/api/files/[id]/share/route';
import { DELETE as revokeShare } from '@/app/api/share/[token]/route';
import { GET as viewShare } from '@/app/api/share/[token]/view/route';
import { GET as downloadShare } from '@/app/api/share/[token]/download/route';
import { NextRequest } from 'next/server';
import { db } from '@collabverse/api/db/config';
import { files, organizations, users } from '@collabverse/api/db/schema';
import { resetTestDb } from './utils/db-cleaner';

// Mock fetch for blob requests
global.fetch = jest.fn();

describe('Share Links API', () => {
  let fileId: string;
  let organizationId: string;
  let userId: string;
  const adminEmail = 'admin.demo@collabverse.test';
  const session = encodeDemoSession({
    email: adminEmail,
    userId: TEST_ADMIN_USER_ID,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`
  };

  beforeEach(async () => {
    await resetTestDb();

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        id: TEST_ADMIN_USER_ID,
        email: adminEmail,
        name: 'Test Admin'
      })
      .returning();
    if (!user) throw new Error('Failed to create test user');
    userId = user.id;

    // Create test organization
    const [org] = await db
      .insert(organizations)
      .values({
        ownerId: userId,
        name: 'Test Org',
        type: 'closed'
      })
      .returning();
    if (!org) throw new Error('Failed to create test organization');
    organizationId = org.id;

    // Create test file
    const [file] = await db
      .insert(files)
      .values({
        organizationId,
        uploadedBy: userId,
        filename: 'test-file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: 'projects/test/test-file.pdf',
        storageUrl: 'https://test.blob.vercel-storage.com/projects/test/test-file.pdf'
      })
      .returning();
    if (!file) throw new Error('Failed to create test file');
    fileId = file.id;

    // Mock fetch for blob requests
    const mockBodyStream = {
      getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }),
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockBodyStream,
      arrayBuffer: async () => new ArrayBuffer(1024)
    });
  });

  afterEach(async () => {
    await resetTestDb();
    jest.clearAllMocks();
  });

  describe('POST /api/files/[id]/share', () => {
    it('should create a share link with view scope', async () => {
      const req = new NextRequest('http://localhost/api/files/' + fileId + '/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'view'
        })
      });

      const res = await createShare(req, { params: { id: fileId } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.share).toBeDefined();
      expect(data.data.share.scope).toBe('view');
      expect(data.data.share.token).toBeDefined();
    });

    it('should create a share link with download scope', async () => {
      const req = new NextRequest('http://localhost/api/files/' + fileId + '/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'download'
        })
      });

      const res = await createShare(req, { params: { id: fileId } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.share.scope).toBe('download');
    });

    it('should create a share link with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const req = new NextRequest('http://localhost/api/files/' + fileId + '/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'view',
          expiresAt
        })
      });

      const res = await createShare(req, { params: { id: fileId } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.share.expiresAt).toBe(expiresAt);
    });

    it('should return 404 for non-existent file', async () => {
      const req = new NextRequest('http://localhost/api/files/non-existent/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scope: 'view'
        })
      });

      const res = await createShare(req, { params: { id: 'non-existent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('FILE_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const req = new NextRequest('http://localhost/api/files/' + fileId + '/share', {
        method: 'POST',
        body: JSON.stringify({
          scope: 'view'
        })
      });

      const res = await createShare(req, { params: { id: fileId } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/share/[token]', () => {
    it('should revoke a share link', async () => {
      // Create a share first
      const share = await sharesRepository.create({
        fileId,
        token: 'test-token',
        scope: 'view',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token, {
        method: 'DELETE',
        headers
      });

      const res = await revokeShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.revoked).toBe(true);

      // Verify share is deleted
      const deletedShare = await sharesRepository.findByToken(share.token);
      expect(deletedShare).toBeNull();
    });

    it('should return 404 for non-existent token', async () => {
      const req = new NextRequest('http://localhost/api/share/non-existent', {
        method: 'DELETE',
        headers
      });

      const res = await revokeShare(req, { params: { token: 'non-existent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('SHARE_NOT_FOUND');
    });

    it('should return 403 if user did not create the share', async () => {
      // Create share with different user
      const share = await sharesRepository.create({
        fileId,
        token: 'test-token',
        scope: 'view',
        createdBy: 'different-user-id'
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token, {
        method: 'DELETE',
        headers
      });

      const res = await revokeShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /api/share/[token]/view', () => {
    it('should return file content for valid view token', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'view-token',
        scope: 'view',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/view');
      const res = await viewShare(req, { params: { token: share.token } });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('inline');
    });

    it('should use streaming instead of loading entire file into memory', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'view-token-stream',
        scope: 'view',
        createdBy: userId
      });

      // Track if arrayBuffer is called (it shouldn't be with streaming)
      let arrayBufferCalled = false;
      const mockArrayBuffer = jest.fn().mockImplementation(async () => {
        arrayBufferCalled = true;
        return new ArrayBuffer(1024);
      });

      // Create a mock response with a body stream (simulating ReadableStream)
      const mockBodyStream = {
        // Simulate ReadableStream-like object
        getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockBodyStream,
        arrayBuffer: mockArrayBuffer,
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/view');
      const res = await viewShare(req, { params: { token: share.token } });

      expect(res.status).toBe(200);
      // Verify response has a body (streaming proxy)
      expect(res.body).toBeDefined();
      // Verify arrayBuffer was not called (confirms streaming approach)
      expect(arrayBufferCalled).toBe(false);
    });

    it('should return 404 for expired token', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      const share = await sharesRepository.create({
        fileId,
        token: 'expired-token',
        scope: 'view',
        expiresAt: expiredDate,
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/view');
      const res = await viewShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('SHARE_EXPIRED');
    });

    it('should return 403 for download scope token on view endpoint', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'download-token',
        scope: 'download',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/view');
      const res = await viewShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('INVALID_SCOPE');
    });

    it('should return 404 for non-existent token', async () => {
      const req = new NextRequest('http://localhost/api/share/non-existent/view');
      const res = await viewShare(req, { params: { token: 'non-existent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('SHARE_NOT_FOUND');
    });
  });

  describe('GET /api/share/[token]/download', () => {
    it('should stream download for valid download token', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'download-token',
        scope: 'download',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/download', {
        headers
      });
      const res = await downloadShare(req, { params: { token: share.token } });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
      expect(res.body).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'download-token',
        scope: 'download',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/download');
      const res = await downloadShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('should return 403 for view scope token on download endpoint', async () => {
      const share = await sharesRepository.create({
        fileId,
        token: 'view-token',
        scope: 'view',
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/download', {
        headers
      });
      const res = await downloadShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('INVALID_SCOPE');
    });

    it('should return 404 for expired token', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      const share = await sharesRepository.create({
        fileId,
        token: 'expired-token',
        scope: 'download',
        expiresAt: expiredDate,
        createdBy: userId
      });

      const req = new NextRequest('http://localhost/api/share/' + share.token + '/download', {
        headers
      });
      const res = await downloadShare(req, { params: { token: share.token } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('SHARE_EXPIRED');
    });
  });
});
