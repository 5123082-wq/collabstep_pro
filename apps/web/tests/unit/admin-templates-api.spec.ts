import { NextRequest } from 'next/server';
import { encodeDemoSession } from '@/lib/auth/demo-session';
import { templatesRepository, memory, TEST_ADMIN_USER_ID } from '@collabverse/api';
import { GET, POST } from '@/app/api/admin/templates/route';

describe('Admin Templates API', () => {
  const adminEmail = 'admin.demo@collabverse.test';
  const adminUserId = TEST_ADMIN_USER_ID;
  const adminSession = encodeDemoSession({
    email: adminEmail,
    userId: adminUserId,
    role: 'admin',
    issuedAt: Date.now()
  });

  beforeEach(() => {
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
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
    });

    it('returns 401 for unauthorized request', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('returns 403 for non-admin user', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('forbidden');
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

