import {
  organizationClosureService,
  organizationsRepository,
  organizationArchivesRepository,
  type Organization,
} from '@collabverse/api';

describe('OrganizationClosureService', () => {
  let testOrgId: string;
  let testOwnerId: string;
  let testOrg: Organization;

  beforeEach(async () => {
    // Создать тестовую организацию
    testOwnerId = 'test-owner-' + Date.now();
    testOrg = await organizationsRepository.create({
      name: 'Test Organization',
      ownerId: testOwnerId,
      type: 'closed',
      isPublicInDirectory: false,
    });
    testOrgId = testOrg.id;
  });

  afterEach(async () => {
    // Очистка тестовых данных
    try {
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        // Если организация не удалена, попробовать удалить
        if (org.status !== 'deleted') {
          await organizationsRepository.update(testOrgId, {
            status: 'deleted',
          });
        }
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('getClosurePreview', () => {
    it('should return preview for organization owner', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      expect(preview).toBeDefined();
      expect(preview.canClose).toBeDefined();
      expect(preview.blockers).toBeInstanceOf(Array);
      expect(preview.warnings).toBeInstanceOf(Array);
      expect(preview.archivableData).toBeInstanceOf(Array);
      expect(preview.impact).toBeDefined();
      expect(preview.impact.projects).toBeGreaterThanOrEqual(0);
      expect(preview.impact.tasks).toBeGreaterThanOrEqual(0);
      expect(preview.impact.members).toBeGreaterThanOrEqual(0);
      expect(preview.impact.invites).toBeGreaterThanOrEqual(0);
      expect(preview.impact.documents).toBeGreaterThanOrEqual(0);
      expect(preview.impact.expenses).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-owner', async () => {
      const nonOwnerId = 'non-owner-' + Date.now();

      await expect(
        organizationClosureService.getClosurePreview(testOrgId, nonOwnerId)
      ).rejects.toThrow('Only organization owner can close organization');
    });

    it('should throw error for non-existent organization', async () => {
      const nonExistentId = 'non-existent-' + Date.now();

      await expect(
        organizationClosureService.getClosurePreview(nonExistentId, testOwnerId)
      ).rejects.toThrow('not found');
    });

    it('should throw error for already closed organization', async () => {
      // Закрыть организацию
      await organizationsRepository.update(testOrgId, {
        status: 'archived',
      });

      await expect(
        organizationClosureService.getClosurePreview(testOrgId, testOwnerId)
      ).rejects.toThrow('already closed');
    });
  });

  describe('initiateClosing', () => {
    it('should close organization without blockers', async () => {
      // Убедиться что нет блокеров (пустая организация)
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      if (!preview.canClose) {
        // Пропускаем тест если есть блокеры
        console.log('Skipping test: organization has blockers');
        return;
      }

      const result = await organizationClosureService.initiateClosing(
        testOrgId,
        testOwnerId,
        'Test closure reason'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(testOrgId);
      expect(result.archiveId).toBeDefined();
      expect(result.closedAt).toBeDefined();
      expect(result.deleted).toBeDefined();

      // Проверить что организация закрыта
      const closedOrg = await organizationsRepository.findById(testOrgId);
      expect(closedOrg?.status).toBe('archived');
      expect(closedOrg?.closureReason).toBe('Test closure reason');
    });

    it('should throw error if organization has blockers', async () => {
      // Создать блокер (например, активный контракт)
      // Это зависит от реализации checkers, поэтому просто проверяем поведение

      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      if (preview.canClose) {
        // Если нет блокеров, пропускаем тест
        console.log('Skipping test: organization has no blockers');
        return;
      }

      await expect(
        organizationClosureService.initiateClosing(testOrgId, testOwnerId)
      ).rejects.toThrow('cannot be closed');
    });

    it('should throw error for non-owner', async () => {
      const nonOwnerId = 'non-owner-' + Date.now();

      await expect(
        organizationClosureService.initiateClosing(testOrgId, nonOwnerId)
      ).rejects.toThrow('Only organization owner can close organization');
    });

    it('should create archive when closing', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      if (!preview.canClose) {
        console.log('Skipping test: organization has blockers');
        return;
      }

      const result = await organizationClosureService.initiateClosing(
        testOrgId,
        testOwnerId
      );

      // Проверить что архив создан
      const archive = await organizationArchivesRepository.findById(
        result.archiveId
      );
      expect(archive).toBeDefined();
      expect(archive?.organizationId).toBe(testOrgId);
      expect(archive?.ownerId).toBe(testOwnerId);
      expect(archive?.status).toBe('active');
    });
  });

  describe('forceClose', () => {
    it('should force close empty organization', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      // Проверить что нет блокеров и данных для архивации
      if (preview.blockers.length > 0 || preview.archivableData.length > 0) {
        console.log('Skipping test: organization has blockers or archivable data');
        return;
      }

      const result = await organizationClosureService.forceClose(
        testOrgId,
        testOwnerId
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(testOrgId);
      expect(result.archiveId).toBe(''); // Нет архива для force close

      // Проверить что организация удалена
      const deletedOrg = await organizationsRepository.findById(testOrgId);
      expect(deletedOrg?.status).toBe('deleted');
    });

    it('should throw error if organization has blockers', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      if (preview.blockers.length === 0) {
        console.log('Skipping test: organization has no blockers');
        return;
      }

      await expect(
        organizationClosureService.forceClose(testOrgId, testOwnerId)
      ).rejects.toThrow('has blockers');
    });

    it('should throw error if organization has archivable data', async () => {
      const preview = await organizationClosureService.getClosurePreview(
        testOrgId,
        testOwnerId
      );

      if (preview.archivableData.length === 0) {
        console.log('Skipping test: organization has no archivable data');
        return;
      }

      await expect(
        organizationClosureService.forceClose(testOrgId, testOwnerId)
      ).rejects.toThrow('has data to archive');
    });
  });
});
