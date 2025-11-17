import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  projectsRepository,
  projectChatRepository,
  resetFinanceMemory
} from '@collabverse/api';
import { GET as getChatMessages, POST as createChatMessage } from '@/app/api/pm/projects/[id]/chat/route';

describe('Project Chat API', () => {
  let projectId: string;
  const userId = 'admin.demo@collabverse.test';
  const session = encodeDemoSession({
    email: userId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(() => {
    resetFinanceMemory();
    
    // Создаем проект для тестов
    const project = projectsRepository.list()[0];
    if (!project) {
      throw new Error('No project found');
    }
    projectId = project.id;
  });

  describe('GET /api/pm/projects/[id]/chat', () => {
    it('should return empty array when no messages exist', async () => {
      const response = await getChatMessages(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.messages).toEqual([]);
      expect(data.data.pagination).toBeDefined();
    });

    it('should return messages for a project', async () => {
      // Создаем сообщение напрямую через repository
      const message = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Test message'
      });

      const response = await getChatMessages(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.messages).toHaveLength(1);
      expect(data.data.messages[0].body).toBe('Test message');
      expect(data.data.messages[0].author).toBeDefined();
    });

    it('should support pagination', async () => {
      // Создаем несколько сообщений
      for (let i = 0; i < 5; i++) {
        projectChatRepository.create({
          projectId,
          authorId: userId,
          body: `Message ${i}`
        });
      }

      const response = await getChatMessages(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat?page=1&pageSize=2`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.messages).toHaveLength(2);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.pageSize).toBe(2);
      expect(data.data.pagination.total).toBe(5);
    });

    it('should return 404 if project not found', async () => {
      const response = await getChatMessages(
        new Request('http://localhost/api/pm/projects/non-existent/chat', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getChatMessages(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'GET'
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is viewer', async () => {
      // Создаем сессию для viewer
      const viewerSession = encodeDemoSession({
        email: 'viewer@example.com',
        role: 'user',
        issuedAt: Date.now()
      });

      const response = await getChatMessages(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'GET',
          headers: { cookie: `cv_session=${viewerSession}` }
        }),
        { params: { id: projectId } }
      );

      // Viewer не имеет доступа к чату
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/pm/projects/[id]/chat', () => {
    it('should create a new message', async () => {
      const response = await createChatMessage(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'New message',
            attachments: []
          })
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.message.body).toBe('New message');
      expect(data.data.message.authorId).toBe(userId);
      expect(data.data.message.author).toBeDefined();
    });

    it('should validate message body', async () => {
      const response = await createChatMessage(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: '',
            attachments: []
          })
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(400);
    });

    it('should support attachments', async () => {
      const response = await createChatMessage(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'Message with attachments',
            attachments: ['file-id-1', 'file-id-2']
          })
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.message.attachments).toHaveLength(2);
    });

    it('should trim message body', async () => {
      const response = await createChatMessage(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: '  Trimmed message  ',
            attachments: []
          })
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.message.body).toBe('Trimmed message');
    });

    it('should return 404 if project not found', async () => {
      const response = await createChatMessage(
        new Request('http://localhost/api/pm/projects/non-existent/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'Message',
            attachments: []
          })
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await createChatMessage(
        new Request(`http://localhost/api/pm/projects/${projectId}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            body: 'Message',
            attachments: []
          })
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('ProjectChatRepository', () => {
    it('should create a message', () => {
      const message = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Test message'
      });

      expect(message.id).toBeDefined();
      expect(message.projectId).toBe(projectId);
      expect(message.authorId).toBe(userId);
      expect(message.body).toBe('Test message');
      expect(message.createdAt).toBeDefined();
    });

    it('should list messages by project with pagination', () => {
      // Создаем несколько сообщений
      for (let i = 0; i < 10; i++) {
        projectChatRepository.create({
          projectId,
          authorId: userId,
          body: `Message ${i}`
        });
      }

      const result = projectChatRepository.listByProject(projectId, { page: 1, pageSize: 5 });
      expect(result.messages).toHaveLength(5);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(5);
    });

    it('should sort messages by date (newest first)', () => {
      const msg1 = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'First message',
        createdAt: '2025-01-01T00:00:00.000Z'
      });

      const msg2 = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Second message',
        createdAt: '2025-01-02T00:00:00.000Z'
      });

      const result = projectChatRepository.listByProject(projectId);
      expect(result.messages[0].id).toBe(msg2.id);
      expect(result.messages[1].id).toBe(msg1.id);
    });

    it('should update a message', () => {
      const message = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Original message'
      });

      const updated = projectChatRepository.update(message.id, {
        body: 'Updated message'
      });

      expect(updated).not.toBeNull();
      expect(updated?.body).toBe('Updated message');
      expect(updated?.updatedAt).not.toBe(message.updatedAt);
    });

    it('should delete a message', () => {
      const message = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Message to delete'
      });

      projectChatRepository.delete(message.id);

      const found = projectChatRepository.findById(message.id);
      expect(found).toBeNull();
    });

    it('should find message by id', () => {
      const message = projectChatRepository.create({
        projectId,
        authorId: userId,
        body: 'Findable message'
      });

      const found = projectChatRepository.findById(message.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(message.id);
      expect(found?.body).toBe('Findable message');
    });
  });
});

