import { NextRequest } from 'next/server';
import { encodeDemoSession } from '@/lib/auth/demo-session';
import { templatesRepository, memory, TEST_ADMIN_USER_ID, resetFinanceMemory } from '@collabverse/api';
import { GET, POST } from '@/app/api/admin/templates/route';
import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { resetTestDb } from './utils/db-cleaner';

describe('Admin Templates API', () => {
  const adminEmail = 'admin.demo@collabverse.test';
  const adminUserId = TEST_ADMIN_USER_ID;
  const adminSession = encodeDemoSession({
    email: adminEmail,
    userId: adminUserId,
    role: 'admin',
    issuedAt: Date.now()
  });

  const headers = {
    cookie: `cv_session=${adminSession}`,
    'content-type': 'application/json'
  };

  beforeEach(async () => {
    await resetTestDb();
    resetFinanceMemory();

    // Ensure admin user exists in DB
    await db.insert(users).values({
      id: adminUserId,
      email: adminEmail,
      name: 'Admin User',
    });

    // Reset to initial state
    memory.TEMPLATES = [
      {
        id: 'tpl-admin-discovery',
        title: 'Админский discovery',
        kind: 'product',
        summary: 'Скрипты интервью',
        projectType: 'product',
        projectStage: 'discovery',
        projectVisibility: 'private'
      }
    ];
  });

  describe('GET /api/admin/templates', () => {
    it('returns templates list for admin', async () => {
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'GET',
        headers
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
    });

    it('returns 401 for unauthorized request', async () => {
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'GET'
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const userSession = encodeDemoSession({
        email: 'user@example.com',
        userId: 'user-1',
        role: 'user',
        issuedAt: Date.now()
      });
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'GET',
        headers: { cookie: `cv_session=${userSession}` }
      });
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/templates', () => {
    it('creates new template for admin', async () => {
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: {
          cookie: `cv_session=${adminSession}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Template',
          kind: 'product',
          summary: 'Test summary',
          projectType: 'product',
          projectStage: 'design',
          projectVisibility: 'private'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item).toBeDefined();
      expect(data.item.title).toBe('New Template');
      expect(data.item.projectType).toBe('product');

      const templates = templatesRepository.list();
      expect(templates.some(t => t.id === data.item.id)).toBe(true);
    });

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: {
          cookie: `cv_session=${adminSession}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'product'
          // missing title
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 401 for unauthorized request', async () => {
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test',
          kind: 'product'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});

