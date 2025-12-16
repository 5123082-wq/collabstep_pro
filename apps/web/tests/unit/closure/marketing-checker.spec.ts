import { MarketingClosureChecker } from '@collabverse/api';

describe('MarketingClosureChecker', () => {
  let checker: MarketingClosureChecker;

  beforeEach(() => {
    checker = new MarketingClosureChecker();
  });

  describe('check', () => {
    it('should return empty results (stub implementation)', async () => {
      const result = await checker.check('test-org-id');

      expect(result.moduleId).toBe('marketing');
      expect(result.moduleName).toBe('Маркетинг');
      expect(result.blockers).toHaveLength(0);
      expect(result.archivableData).toHaveLength(0);
    });
  });

  describe('archive', () => {
    it('should do nothing (stub implementation)', async () => {
      // Заглушка не архивирует данные
      await expect(checker.archive('test-org-id', 'archive-1')).resolves.not.toThrow();
    });
  });

  describe('deleteArchived', () => {
    it('should do nothing (stub implementation)', async () => {
      // Заглушка не удаляет данные
      await expect(checker.deleteArchived('archive-1')).resolves.not.toThrow();
    });
  });
});
