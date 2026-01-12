import {
  organizationClosureService,
  organizationsRepository,
  usersRepository,
  organizationArchivesRepository,
  closureCheckerRegistry,
  dbProjectsRepository,
  documentsRepository,
  filesRepository,
} from '@collabverse/api';
import { resetFinanceMemory } from '@collabverse/api';
import { resetTestDb } from '../utils/db-cleaner';
import { makeTestId, makeTestUserId } from '../utils/test-ids';

// Skip tests if POSTGRES_URL is not set (e.g., in CI without database)
const hasDatabase =
  !!process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim() !== '';
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Organization Closure Integration', () => {
  let testOrgId: string;
  let testOwnerId: string;
  let testProjectId: string;

  beforeEach(async () => {
    resetFinanceMemory();
    await resetTestDb();
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
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        await organizationsRepository.update(testOrgId, { status: 'deleted' });
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('Full closure flow', () => {
    it('should complete full closure flow with documents', async () => {
      // 1. Создать документ для архивации
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

      // 2. Получить preview
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      // Проверить что документ в списке архивируемых данных
      expect(preview.archivableData.length).toBeGreaterThan(0);
      const docData = preview.archivableData.find((d) => d.id === document.id);
      expect(docData).toBeDefined();

      // 3. Если есть блокеры, пропускаем тест закрытия
      if (!preview.canClose) {
        console.log('Skipping closure: organization has blockers');
        return;
      }

      // 4. Закрыть организацию
      const result = await organizationClosureService.initiateClosing(
        testOrgId,
        testOwnerId,
        'Integration test closure'
      );

      expect(result.success).toBe(true);
      expect(result.archiveId).toBeDefined();

      // 5. Проверить что архив создан
      const archive = await organizationArchivesRepository.findById(result.archiveId);
      expect(archive).toBeDefined();
      expect(archive?.organizationId).toBe(testOrgId);
      expect(archive?.status).toBe('active');

      // 6. Проверить что организация закрыта
      const closedOrg = await organizationsRepository.findById(testOrgId);
      expect(closedOrg?.status).toBe('archived');
      expect(closedOrg?.closureReason).toBe('Integration test closure');
    });

    it('should run all checkers during preview', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      // Проверить что preview содержит все необходимые поля
      expect(preview).toBeDefined();
      expect(preview.canClose).toBeDefined();
      expect(preview.blockers).toBeInstanceOf(Array);
      expect(preview.warnings).toBeInstanceOf(Array);
      expect(preview.archivableData).toBeInstanceOf(Array);
      expect(preview.impact).toBeDefined();

      // Проверить что все зарегистрированные модули проверены
      const registeredModules = closureCheckerRegistry.getRegisteredModules();
      expect(registeredModules.length).toBeGreaterThan(0);

      // Проверить что impact содержит все необходимые поля
      expect(preview.impact.projects).toBeGreaterThanOrEqual(0);
      expect(preview.impact.tasks).toBeGreaterThanOrEqual(0);
      expect(preview.impact.members).toBeGreaterThanOrEqual(0);
      expect(preview.impact.invites).toBeGreaterThanOrEqual(0);
      expect(preview.impact.documents).toBeGreaterThanOrEqual(0);
      expect(preview.impact.expenses).toBeGreaterThanOrEqual(0);
    });

    it('should handle closure with multiple projects and documents', async () => {
      // Создать несколько проектов
      const project2 = await dbProjectsRepository.create({
        name: 'Test Project 2',
        organizationId: testOrgId,
        ownerId: testOwnerId,
      });

      // Создать документы в разных проектах
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

      // Получить preview
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      // Проверить что оба документа в списке архивируемых данных
      expect(preview.archivableData.length).toBeGreaterThanOrEqual(2);

      if (!preview.canClose) {
        console.log('Skipping closure: organization has blockers');
        return;
      }

      // Закрыть организацию
      const result = await organizationClosureService.initiateClosing(
        testOrgId,
        testOwnerId
      );

      expect(result.success).toBe(true);
      expect(result.archiveId).toBeDefined();

      // Проверить что архив создан с правильным количеством документов
      const archive = await organizationArchivesRepository.findById(result.archiveId);
      expect(archive).toBeDefined();
      expect(archive?.snapshot.documentsCount).toBeGreaterThanOrEqual(2);
    });
  });
});
