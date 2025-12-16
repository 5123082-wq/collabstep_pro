import {
  WalletClosureChecker,
  organizationsRepository,
  usersRepository,
  walletRepository,
} from '@collabverse/api';
import { amountToCents } from '@collabverse/api/utils/money';

describe('WalletClosureChecker', () => {
  let checker: WalletClosureChecker;
  let testOrgId: string;
  let testOwnerId: string;

  beforeEach(async () => {
    checker = new WalletClosureChecker();

    // Создать тестового владельца организации
    testOwnerId = 'test-owner-' + Date.now();
    await usersRepository.create({
      id: testOwnerId,
      email: `owner-${Date.now()}@test.com`,
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
  });

  afterEach(async () => {
    // Очистка тестовых данных
    try {
      // Удалить организацию (кошелёк останется в БД, но это нормально для тестов)
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        await organizationsRepository.update(testOrgId, { status: 'deleted' });
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('check', () => {
    it('should block closure when wallet has balance', async () => {
      // Создать кошелёк с балансом
      const wallet = await walletRepository.createWallet(testOrgId, 'organization', 'RUB');
      if (wallet) {
        const balance = Number(amountToCents('15000'));
        await walletRepository.updateBalance(wallet.id, balance);
      }

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
      const blocker = result.blockers.find((b) => b.moduleId === 'wallet');
      expect(blocker).toBeDefined();
      if (blocker) {
        expect(blocker.severity).toBe('blocking');
        expect(blocker.type).toBe('financial');
        expect(blocker.moduleId).toBe('wallet');
        expect(blocker.title).toBe('Баланс кошелька');
        expect(blocker.description).toContain('15 000');
        expect(blocker.actionRequired).toBe('Выведите все средства перед закрытием организации');
      }
      expect(result.archivableData).toHaveLength(0);
    });

    it('should not block closure when wallet has zero balance', async () => {
      // Создать кошелёк с нулевым балансом (баланс по умолчанию 0)
      await walletRepository.createWallet(testOrgId, 'organization', 'RUB');

      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
    });

    it('should not block closure when wallet does not exist', async () => {
      // Не создавать кошелёк

      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
    });

    it('should handle different currencies', async () => {
      // Создать кошелёк с балансом в USD
      const wallet = await walletRepository.createWallet(testOrgId, 'organization', 'USD');
      if (wallet) {
        const balance = Number(amountToCents('1000'));
        await walletRepository.updateBalance(wallet.id, balance);
      }

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
      const blocker = result.blockers.find((b) => b.moduleId === 'wallet');
      expect(blocker?.description).toContain('USD');
    });
  });

  describe('archive', () => {
    it('should do nothing (wallet is not archived)', async () => {
      // Кошелёк не архивируется, метод должен просто завершиться без ошибок
      await expect(checker.archive(testOrgId, 'archive-1')).resolves.not.toThrow();
    });
  });

  describe('deleteArchived', () => {
    it('should do nothing (nothing to delete)', async () => {
      // Нечего удалять для кошелька
      await expect(checker.deleteArchived('archive-1')).resolves.not.toThrow();
    });
  });
});
