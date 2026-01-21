import {
  ContractsClosureChecker,
  organizationsRepository,
  usersRepository,
  contractsRepository,
} from '@collabverse/api';
import { amountToCents } from '@collabverse/api/utils/money';
import { resetFinanceMemory } from '@collabverse/api';
import { resetTestDb } from '../utils/db-cleaner';
import { makeTestId, makeTestUserId } from '../utils/test-ids';

// Skip tests if POSTGRES_URL is not set (e.g., in CI without database)
const hasDatabase =
  !!process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim() !== '';
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('ContractsClosureChecker', () => {
  let checker: ContractsClosureChecker;
  let testOrgId: string;
  let testOwnerId: string;
  let testPerformerId: string;
  let testTaskId: string;

  beforeEach(async () => {
    resetFinanceMemory();
    await resetTestDb();
    checker = new ContractsClosureChecker();

    // Создать тестового владельца организации
    const owner = makeTestUserId('owner');
    testOwnerId = owner.id;
    await usersRepository.create({
      id: owner.id,
      email: owner.email,
      name: 'Test Owner',
    });

    // Создать тестового исполнителя
    const performer = makeTestUserId('performer');
    testPerformerId = performer.id;
    await usersRepository.create({
      id: performer.id,
      email: performer.email,
      name: 'Test Performer',
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

    // Создать тестовую задачу (ID для контракта)
    testTaskId = makeTestId('task');
  });

  afterEach(async () => {
    // Очистка тестовых данных
    try {
      // Удалить организацию (контракты удалятся каскадно или останутся в БД)
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        await organizationsRepository.update(testOrgId, { status: 'deleted' });
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('check', () => {
    it('should block closure when active contract exists', async () => {
      // Создать активный контракт
      const contractAmount = Number(amountToCents('50000'));
      await contractsRepository.create({
        id: 'contract-1',
        taskId: testTaskId,
        performerId: testPerformerId,
        organizationId: testOrgId,
        amount: contractAmount,
        currency: 'RUB',
        status: 'funded',
      });

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
      const blocker = result.blockers.find((b) => b.id === 'contract-1');
      expect(blocker).toBeDefined();
      if (blocker) {
        expect(blocker.severity).toBe('blocking');
        expect(blocker.type).toBe('financial');
        expect(blocker.moduleId).toBe('contracts');
        expect(blocker.title).toBe('Активный контракт');
      }
      expect(result.archivableData).toHaveLength(0);
    });

    it('should not block closure when no active contracts', async () => {
      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
      expect(result.archivableData).toHaveLength(0);
    });

    it('should not block closure when contract is paid', async () => {
      // Создать оплаченный контракт
      const contractAmount = Number(amountToCents('50000'));
      await contractsRepository.create({
        id: 'contract-paid',
        taskId: testTaskId,
        performerId: testPerformerId,
        organizationId: testOrgId,
        amount: contractAmount,
        currency: 'RUB',
        status: 'paid', // Оплаченный контракт не блокирует
      });

      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
    });

    it('should block closure for all active statuses', async () => {
      const activeStatuses: Array<'accepted' | 'funded' | 'completed' | 'disputed'> = [
        'accepted',
        'funded',
        'completed',
        'disputed',
      ];

      const contractAmount = Number(amountToCents('10000'));

      // Создать контракты со всеми активными статусами
      for (let i = 0; i < activeStatuses.length; i++) {
        await contractsRepository.create({
          id: `contract-${i}`,
          taskId: `task-${i}`,
          performerId: testPerformerId,
          organizationId: testOrgId,
          amount: contractAmount,
          currency: 'RUB',
          status: activeStatuses[i],
        });
      }

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThanOrEqual(activeStatuses.length);
      result.blockers.forEach((blocker) => {
        expect(blocker.severity).toBe('blocking');
        expect(blocker.type).toBe('financial');
      });
    });

    it('should return correct action messages for different statuses', async () => {
      const contractAmount = Number(amountToCents('10000'));

      // Тест для статуса 'accepted'
      await contractsRepository.create({
        id: 'contract-accepted',
        taskId: testTaskId,
        performerId: testPerformerId,
        organizationId: testOrgId,
        amount: contractAmount,
        currency: 'RUB',
        status: 'accepted',
      });

      let result = await checker.check(testOrgId);
      const acceptedBlocker = result.blockers.find((b) => b.id === 'contract-accepted');
      expect(acceptedBlocker?.actionRequired).toBe('Завершите контракт или отмените его');

      // Обновить контракт на статус 'funded'
      await contractsRepository.updateStatus('contract-accepted', 'funded');
      result = await checker.check(testOrgId);
      const fundedBlocker = result.blockers.find((b) => b.id === 'contract-accepted');
      expect(fundedBlocker?.actionRequired).toBe('Завершите работу по контракту или верните средства');

      // Обновить контракт на статус 'completed'
      await contractsRepository.updateStatus('contract-accepted', 'completed');
      result = await checker.check(testOrgId);
      const completedBlocker = result.blockers.find((b) => b.id === 'contract-accepted');
      expect(completedBlocker?.actionRequired).toBe('Оплатите контракт');

      // Обновить контракт на статус 'disputed'
      await contractsRepository.updateStatus('contract-accepted', 'disputed');
      result = await checker.check(testOrgId);
      const disputedBlocker = result.blockers.find((b) => b.id === 'contract-accepted');
      expect(disputedBlocker?.actionRequired).toBe('Разрешите спор по контракту');
    });
  });

  describe('archive', () => {
    it('should do nothing (contracts are not archived)', async () => {
      // Контракты не архивируются, метод должен просто завершиться без ошибок
      await expect(checker.archive(testOrgId, 'archive-1')).resolves.not.toThrow();
    });
  });

  describe('deleteArchived', () => {
    it('should do nothing (nothing to delete)', async () => {
      // Нечего удалять для контрактов
      await expect(checker.deleteArchived('archive-1')).resolves.not.toThrow();
    });
  });
});
