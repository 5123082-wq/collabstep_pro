import { NextRequest } from 'next/server';
import { memory, TEST_ADMIN_USER_ID, resetFinanceMemory } from '@collabverse/api';
import { GET, POST } from '@/app/api/admin/templates/route';
import { db } from '@collabverse/api/db/config';
import { users } from '@collabverse/api/db/schema';
import { resetTestDb } from './utils/db-cleaner';

jest.mock('@/lib/auth/demo-session.server', () => ({
  getDemoSessionFromCookies: jest.fn(),
}));

import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';

describe('Admin Templates API', () => {
  const adminEmail = 'admin.demo@collabverse.test';
  const adminUserId = TEST_ADMIN_USER_ID;
  const adminSession = {
    email: adminEmail,
    userId: adminUserId,
    role: 'admin'
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

    // Default mock implementation (admin)
    (getDemoSessionFromCookies as jest.Mock).mockReturnValue(adminSession);

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
    });

    it('returns 401 for unauthorized request', async () => {
      (getDemoSessionFromCookies as jest.Mock).mockReturnValue(null);
      const response = await GET();

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      (getDemoSessionFromCookies as jest.Mock).mockReturnValue({
        ...adminSession,
        role: 'user'
      });
      const response = await GET();

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/templates', () => {
    it('creates new template for admin', async () => {
      const newTemplate = {
        title: 'New Template',
        kind: 'product',
        summary: 'New Summary',
        projectType: 'product',
        projectStage: 'discovery',
        projectVisibility: 'private'
      };

      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.item).toBeDefined();
      expect(data.item.title).toBe('New Template');
    });

    it('validates required fields', async () => {
      const invalidTemplate = {
        title: '', // Empty title
        kind: 'product'
      };

      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invalidTemplate)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 401 for unauthorized request', async () => {
      (getDemoSessionFromCookies as jest.Mock).mockReturnValue(null);
      const request = new NextRequest('http://localhost/api/admin/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
