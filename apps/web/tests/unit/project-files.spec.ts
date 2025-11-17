import { encodeDemoSession } from '@/lib/auth/demo-session';
import {
  projectsRepository,
  filesRepository,
  attachmentsRepository,
  resetFinanceMemory
} from '@collabverse/api';
import { GET as getProjectFiles, POST as uploadFile } from '@/app/api/pm/projects/[id]/files/route';

describe('Project Files API', () => {
  let projectId: string;
  const userId = 'admin.demo@collabverse.test';
  const session = encodeDemoSession({
    email: userId,
    role: 'admin',
    issuedAt: Date.now()
  });
  const headers = {
    cookie: `cv_session=${session}`
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

  describe('GET /api/pm/projects/[id]/files', () => {
    it('should return empty array when no files exist', async () => {
      const response = await getProjectFiles(
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
      // Создаем файл и attachment
      const file = filesRepository.create({
        filename: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploaderId: userId
      });

      attachmentsRepository.create({
        projectId,
        fileId: file.id,
        linkedEntity: 'project',
        entityId: null,
        createdBy: userId
      });

      const response = await getProjectFiles(
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(1);
      expect(data.data.files[0].filename).toBe('test.txt');
      expect(data.data.files[0].source).toBe('project');
    });

    it('should filter files by source', async () => {
      // Создаем файлы из разных источников
      const file1 = filesRepository.create({
        filename: 'project-file.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploaderId: userId
      });

      const file2 = filesRepository.create({
        filename: 'task-file.txt',
        mimeType: 'text/plain',
        sizeBytes: 200,
        uploaderId: userId
      });

      attachmentsRepository.create({
        projectId,
        fileId: file1.id,
        linkedEntity: 'project',
        entityId: null,
        createdBy: userId
      });

      attachmentsRepository.create({
        projectId,
        fileId: file2.id,
        linkedEntity: 'task',
        entityId: 'task-123',
        createdBy: userId
      });

      const response = await getProjectFiles(
        new Request(`http://localhost/api/pm/projects/${projectId}/files?source=project`, {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.files).toHaveLength(1);
      expect(data.data.files[0].source).toBe('project');
    });

    it('should group files by source', async () => {
      // Создаем файлы из разных источников
      const projectFile = filesRepository.create({
        filename: 'project.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploaderId: userId
      });

      const taskFile = filesRepository.create({
        filename: 'task.txt',
        mimeType: 'text/plain',
        sizeBytes: 200,
        uploaderId: userId
      });

      attachmentsRepository.create({
        projectId,
        fileId: projectFile.id,
        linkedEntity: 'project',
        entityId: null,
        createdBy: userId
      });

      attachmentsRepository.create({
        projectId,
        fileId: taskFile.id,
        linkedEntity: 'task',
        entityId: 'task-123',
        createdBy: userId
      });

      const response = await getProjectFiles(
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
        new Request('http://localhost/api/pm/projects/non-existent/files', {
          method: 'GET',
          headers: { cookie: headers.cookie }
        }),
        { params: { id: 'non-existent' } }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await getProjectFiles(
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
        new Request('http://localhost/api/pm/projects/non-existent/files', {
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
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
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
        new Request(`http://localhost/api/pm/projects/${projectId}/files`, {
          method: 'POST',
          headers: { cookie: headers.cookie },
          body: formData
        }),
        { params: { id: projectId } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Проверяем, что attachment создан
      const attachments = attachmentsRepository.listByProject(projectId);
      const attachment = attachments.find(a => a.fileId === data.data.file.id);
      expect(attachment).toBeDefined();
      expect(attachment?.linkedEntity).toBe('project');
      expect(attachment?.projectId).toBe(projectId);
    });
  });
});

