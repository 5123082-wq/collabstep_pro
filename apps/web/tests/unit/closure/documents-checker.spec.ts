import {
  DocumentsClosureChecker,
  organizationsRepository,
  usersRepository,
  dbProjectsRepository,
  documentsRepository,
  filesRepository,
  organizationArchivesRepository,
  archivedDocumentsRepository,
} from '@collabverse/api';
import { resetFinanceMemory } from '@collabverse/api';
import { resetTestDb } from '../utils/db-cleaner';
import { makeTestId, makeTestUserId } from '../utils/test-ids';

// Skip tests if POSTGRES_URL is not set (e.g., in CI without database)
const hasDatabase =
  !!process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim() !== '';
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('DocumentsClosureChecker', () => {
  let checker: DocumentsClosureChecker;
  let testOrgId: string;
  let testOwnerId: string;
  let testProjectId: string;

  beforeEach(async () => {
    resetFinanceMemory();
    await resetTestDb();
    checker = new DocumentsClosureChecker();

    // Создать тестового владельца организации
    const owner = makeTestUserId('owner');
    testOwnerId = owner.id;
    await usersRepository.create({
      id: owner.id,
      email: owner.email,
      name: 'Test Owner',
    });

    // Создать тестовую организацию
    const testOrg = await organizationsRepository.create({
      name: 'Test Organization',
      ownerId: testOwnerId,
      type: 'closed',
      kind: 'business',
      isPublicInDirectory: false,
    });
    testOrgId = testOrg.id;

    // Создать тестовый проект
    const testProject = await dbProjectsRepository.create({
      name: `Test Project ${makeTestId('proj')}`,
      organizationId: testOrgId,
      ownerId: testOwnerId,
    });
    testProjectId = testProject.id;
  });

  afterEach(async () => {
    // Очистка тестовых данных
    try {
      // Удалить организацию (проекты удалятся каскадно)
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        await organizationsRepository.update(testOrgId, { status: 'deleted' });
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('check', () => {
    it('should return archivable data when documents exist', async () => {
      // Создать файл
      const file = filesRepository.create({
        uploaderId: testOwnerId,
        filename: 'test-document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 1024, // 1 MB
        storageUrl: '/uploads/test-file',
      });

      // Создать документ с версией
      const document = documentsRepository.createDocument({
        projectId: testProjectId,
        title: 'Test Document',
        type: 'pdf',
        createdBy: testOwnerId,
      });

      // Добавить версию документа с файлом
      documentsRepository.createVersion({
        documentId: document.id,
        fileId: file.id,
        createdBy: testOwnerId,
      });

      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
      expect(result.archivableData.length).toBeGreaterThan(0);
      const docData = result.archivableData.find((d) => d.id === document.id);
      expect(docData).toBeDefined();
      expect(docData?.moduleId).toBe('documents');
      expect(docData?.type).toBe('document');
      expect(docData?.title).toBe('Test Document');
      expect(docData?.sizeBytes).toBeGreaterThan(0);
      expect(docData?.metadata?.projectId).toBe(testProjectId);
    });

    it('should return empty archivable data when no documents exist', async () => {
      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
      expect(result.archivableData).toHaveLength(0);
    });

    it('should handle documents without files', async () => {
      // Создать документ без файла
      const document = documentsRepository.createDocument({
        projectId: testProjectId,
        title: 'Document Without File',
        type: 'text',
        createdBy: testOwnerId,
      });

      const result = await checker.check(testOrgId);

      // Документы без файлов тоже должны быть в списке архивируемых данных
      expect(result.archivableData.length).toBeGreaterThan(0);
      const docData = result.archivableData.find((d) => d.id === document.id);
      expect(docData).toBeDefined();
      expect(docData?.sizeBytes).toBe(0);
    });

    it('should handle multiple projects with documents', async () => {
      // Создать второй проект
      const project2 = await dbProjectsRepository.create({
        name: 'Test Project 2',
        organizationId: testOrgId,
        ownerId: testOwnerId,
      });

      // Создать файлы
      const file1 = filesRepository.create({
        uploaderId: testOwnerId,
        filename: 'doc1.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageUrl: '/uploads/file1',
      });

      const file2 = filesRepository.create({
        uploaderId: testOwnerId,
        filename: 'doc2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageUrl: '/uploads/file2',
      });

      // Создать документы в разных проектах
      const doc1 = documentsRepository.createDocument({
        projectId: testProjectId,
        title: 'Document 1',
        type: 'pdf',
        createdBy: testOwnerId,
      });
      documentsRepository.createVersion({
        documentId: doc1.id,
        fileId: file1.id,
        createdBy: testOwnerId,
      });

      const doc2 = documentsRepository.createDocument({
        projectId: project2.id,
        title: 'Document 2',
        type: 'pdf',
        createdBy: testOwnerId,
      });
      documentsRepository.createVersion({
        documentId: doc2.id,
        fileId: file2.id,
        createdBy: testOwnerId,
      });

      const result = await checker.check(testOrgId);

      expect(result.archivableData.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('archive', () => {
    it('should archive documents when archive exists', async () => {
      // Создать архив
      const archive = await organizationArchivesRepository.create({
        organizationId: testOrgId,
        organizationName: 'Test Organization',
        ownerId: testOwnerId,
        retentionDays: 30,
        snapshot: {
          membersCount: 1,
          projectsCount: 1,
          documentsCount: 1,
          totalStorageBytes: 1024,
        },
      });

      // Создать файл и документ
      const file = filesRepository.create({
        uploaderId: testOwnerId,
        filename: 'test-document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageUrl: '/uploads/test-file',
      });

      const document = documentsRepository.createDocument({
        projectId: testProjectId,
        title: 'Test Document',
        type: 'pdf',
        createdBy: testOwnerId,
      });

      documentsRepository.createVersion({
        documentId: document.id,
        fileId: file.id,
        createdBy: testOwnerId,
      });

      // Архивировать документы
      await checker.archive(testOrgId, archive.id);

      // Проверить что документ заархивирован
      const archivedDocs = await archivedDocumentsRepository.findByArchive(archive.id);
      expect(archivedDocs.length).toBeGreaterThan(0);
      const archivedDoc = archivedDocs.find((d) => d.originalDocumentId === document.id);
      expect(archivedDoc).toBeDefined();
      expect(archivedDoc?.title).toBe('Test Document');
      expect(archivedDoc?.fileId).toBe(file.id);
      expect(archivedDoc?.fileSizeBytes).toBe(1024);
    });

    it('should throw error when archive does not exist', async () => {
      await expect(checker.archive(testOrgId, 'non-existent-archive')).rejects.toThrow(
        'Archive not found'
      );
    });
  });

  describe('deleteArchived', () => {
    it('should delete archived documents', async () => {
      // Создать архив
      const archive = await organizationArchivesRepository.create({
        organizationId: testOrgId,
        organizationName: 'Test Organization',
        ownerId: testOwnerId,
        retentionDays: 30,
        snapshot: {
          membersCount: 1,
          projectsCount: 1,
          documentsCount: 1,
          totalStorageBytes: 1024,
        },
      });

      // Создать заархивированный документ
      await archivedDocumentsRepository.create({
        archiveId: archive.id,
        originalDocumentId: 'doc-1',
        originalProjectId: testProjectId,
        projectName: 'Test Project',
        title: 'Test Document',
        type: 'pdf',
        fileId: 'file-1',
        fileUrl: '/uploads/file-1',
        fileSizeBytes: 1024,
        expiresAt: archive.expiresAt,
      });

      // Удалить архивированные документы
      await checker.deleteArchived(archive.id);

      // Проверить что документы удалены
      const archivedDocs = await archivedDocumentsRepository.findByArchive(archive.id);
      expect(archivedDocs).toHaveLength(0);
    });
  });
});
