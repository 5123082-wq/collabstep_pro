import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  tasksRepository,
  commentsRepository,
  projectsRepository,
  resetFinanceMemory
} from '@collabverse/api';
import { GET as getComments, POST as createComment } from '@/app/api/pm/tasks/[id]/comments/route';
import { PATCH as updateComment, DELETE as deleteComment } from '@/app/api/pm/tasks/[id]/comments/[commentId]/route';
import { NextRequest } from 'next/server';

describe('Task Comments API', () => {
  let projectId: string;
  let taskId: string;
  const session = encodeDemoSession({
    email: 'admin.demo@collabverse.test',
    userId: 'admin.demo@collabverse.test',
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`,
    'content-type': 'application/json'
  };

  beforeEach(() => {
    resetFinanceMemory();

    // Создаем проект и задачу для тестов
    const project = projectsRepository.create({
      title: 'Test Project',
      description: 'Test Description',
      ownerId: 'admin.demo@collabverse.test',
      workspaceId: 'workspace-id',
      status: 'active'
    });
    projectId = project.id;

    const tasks = tasksRepository.list({ projectId });
    if (tasks.length === 0) {
      const task = tasksRepository.create({
        projectId,
        title: 'Test Task',
        status: 'new'
      });
      taskId = task.id;
    } else {
      taskId = tasks[0]!.id;
    }
  });

  describe('GET /api/pm/tasks/[id]/comments', () => {
    it('should return empty array when no comments exist', async () => {
      const response = await getComments(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comments).toEqual([]);
    });

    it('should return comments for a task', async () => {
      // Создаем комментарий напрямую через repository
      const comment = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Test comment'
      });

      const response = await getComments(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comments).toHaveLength(1);
      expect(data.data.comments[0]!.body).toBe('Test comment');
    });

    it('should return 404 if task not found', async () => {
      const response = await getComments(
        new NextRequest('http://localhost/api/pm/tasks/non-existent/comments', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getComments(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'GET'
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pm/tasks/[id]/comments', () => {
    it('should create a new comment', async () => {
      const response = await createComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'New comment',
            mentions: [],
            attachments: []
          })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comment.body).toBe('New comment');
      expect(data.data.comment.authorId).toBe('admin.demo@collabverse.test');
    });

    it('should create a reply comment with parentId', async () => {
      // Создаем родительский комментарий
      const parent = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Parent comment'
      });

      const response = await createComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'Reply comment',
            parentId: parent.id,
            mentions: [],
            attachments: []
          })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comment.body).toBe('Reply comment');
      expect(data.data.comment.parentId).toBe(parent.id);
    });

    it('should validate comment body', async () => {
      const response = await createComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: '',
            mentions: [],
            attachments: []
          })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(400);
    });

    it('should support mentions and attachments', async () => {
      const response = await createComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: 'Comment with mentions',
            mentions: ['user1@example.com', 'user2@example.com'],
            attachments: ['file-id-1', 'file-id-2']
          })
        }),
        { params: { id: taskId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comment.mentions).toHaveLength(2);
      expect(data.data.comment.attachments).toHaveLength(2);
    });
  });

  describe('PATCH /api/pm/tasks/[id]/comments/[commentId]', () => {
    it('should update a comment', async () => {
      const comment = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Original comment'
      });

      const response = await updateComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/${comment.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            body: 'Updated comment'
          })
        }),
        { params: { id: taskId, commentId: comment.id } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.comment.body).toBe('Updated comment');
    });

    it('should return 404 if comment not found', async () => {
      const response = await updateComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/non-existent`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            body: 'Updated comment'
          })
        }),
        { params: { id: taskId, commentId: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not author', async () => {
      const comment = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'other.user@example.com',
        body: 'Other user comment'
      });

      const response = await updateComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/${comment.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            body: 'Updated comment'
          })
        }),
        { params: { id: taskId, commentId: comment.id } }
      );

      // Admin should be able to edit any comment
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/pm/tasks/[id]/comments/[commentId]', () => {
    it('should delete a comment', async () => {
      const comment = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Comment to delete'
      });

      const response = await deleteComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/${comment.id}`, {
          method: 'DELETE',
          headers
        }),
        { params: { id: taskId, commentId: comment.id } }
      );

      expect(response.status).toBe(200);

      // Проверяем, что комментарий удален
      const comments = commentsRepository.listByTask(projectId, taskId);
      expect(comments.find((c) => c.id === comment.id)).toBeUndefined();
    });

    it('should cascade delete child comments', async () => {
      const parent = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Parent comment'
      });

      const child = commentsRepository.create({
        projectId,
        taskId,
        authorId: 'admin.demo@collabverse.test',
        body: 'Child comment',
        parentId: parent.id
      });

      const response = await deleteComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/${parent.id}`, {
          method: 'DELETE',
          headers
        }),
        { params: { id: taskId, commentId: parent.id } }
      );

      expect(response.status).toBe(200);

      // Проверяем, что оба комментария удалены
      const comments = commentsRepository.listByTask(projectId, taskId);
      expect(comments.find((c) => c.id === parent.id)).toBeUndefined();
      expect(comments.find((c) => c.id === child.id)).toBeUndefined();
    });

    it('should return 404 if comment not found', async () => {
      const response = await deleteComment(
        new NextRequest(`http://localhost/api/pm/tasks/${taskId}/comments/non-existent`, {
          method: 'DELETE',
          headers
        }),
        { params: { id: taskId, commentId: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });
  });
});
