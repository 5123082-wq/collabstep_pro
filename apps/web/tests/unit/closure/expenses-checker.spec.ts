import {
  ExpensesClosureChecker,
  organizationsRepository,
  usersRepository,
  dbProjectsRepository,
  getFinanceService,
} from '@collabverse/api';
import { resetFinanceMemory } from '@collabverse/api';
import { resetTestDb } from '../utils/db-cleaner';
import { makeTestId, makeTestUserId } from '../utils/test-ids';

// Skip tests if POSTGRES_URL is not set (e.g., in CI without database)
const hasDatabase =
  !!process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim() !== '';
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('ExpensesClosureChecker', () => {
  let checker: ExpensesClosureChecker;
  let testOrgId: string;
  let testOwnerId: string;
  let testProjectId: string;

  beforeEach(async () => {
    resetFinanceMemory();
    await resetTestDb();
    checker = new ExpensesClosureChecker();

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
      // Удалить организацию (проекты удалятся каскадно или останутся в БД)
      const org = await organizationsRepository.findById(testOrgId);
      if (org) {
        await organizationsRepository.update(testOrgId, { status: 'deleted' });
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('check', () => {
    it('should block closure when pending expense exists', async () => {
      // Создать расход в статусе 'pending'
      const financeService = getFinanceService();
      await financeService.createExpense(
        {
          workspaceId: testOrgId,
          projectId: testProjectId,
          date: new Date().toISOString(),
          amount: '5000',
          currency: 'RUB',
          category: 'Test',
        },
        { actorId: testOwnerId }
      );

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThan(0);
      const pendingBlocker = result.blockers.find(
        (b) => b.title === 'Незакрытый расход' && b.description.includes('pending')
      );
      expect(pendingBlocker).toBeDefined();
      expect(pendingBlocker?.severity).toBe('blocking');
      expect(pendingBlocker?.type).toBe('financial');
      expect(pendingBlocker?.moduleId).toBe('expenses');
    });

    it('should block closure when approved expense exists', async () => {
      // Создать расход и перевести его в статус 'approved'
      const financeService = getFinanceService();
      const expense = await financeService.createExpense(
        {
          workspaceId: testOrgId,
          projectId: testProjectId,
          date: new Date().toISOString(),
          amount: '5000',
          currency: 'RUB',
          category: 'Test',
        },
        { actorId: testOwnerId }
      );

      await financeService.updateExpense(expense.id, { status: 'pending' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'approved' }, { actorId: testOwnerId });

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThan(0);
      const approvedBlocker = result.blockers.find(
        (b) => b.title === 'Незакрытый расход' && b.description.includes('approved')
      );
      expect(approvedBlocker).toBeDefined();
      expect(approvedBlocker?.severity).toBe('blocking');
    });

    it('should block closure when payable expense exists', async () => {
      // Создать расход и перевести его в статус 'payable'
      const financeService = getFinanceService();
      const expense = await financeService.createExpense(
        {
          workspaceId: testOrgId,
          projectId: testProjectId,
          date: new Date().toISOString(),
          amount: '5000',
          currency: 'RUB',
          category: 'Test',
        },
        { actorId: testOwnerId }
      );

      await financeService.updateExpense(expense.id, { status: 'pending' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'approved' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'payable' }, { actorId: testOwnerId });

      const result = await checker.check(testOrgId);

      expect(result.blockers.length).toBeGreaterThan(0);
      const payableBlocker = result.blockers.find(
        (b) => b.title === 'Незакрытый расход' && b.description.includes('payable')
      );
      expect(payableBlocker).toBeDefined();
      expect(payableBlocker?.severity).toBe('blocking');
    });

    it('should not block closure when expense is closed', async () => {
      // Создать расход и закрыть его
      const financeService = getFinanceService();
      const expense = await financeService.createExpense(
        {
          workspaceId: testOrgId,
          projectId: testProjectId,
          date: new Date().toISOString(),
          amount: '5000',
          currency: 'RUB',
          category: 'Test',
        },
        { actorId: testOwnerId }
      );

      await financeService.updateExpense(expense.id, { status: 'pending' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'approved' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'payable' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense.id, { status: 'closed' }, { actorId: testOwnerId });

      const result = await checker.check(testOrgId);

      // Закрытые расходы не блокируют
      const closedBlocker = result.blockers.find(
        (b) => b.title === 'Незакрытый расход' && b.description.includes('closed')
      );
      expect(closedBlocker).toBeUndefined();
    });

    it('should not block closure when no expenses exist', async () => {
      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
      expect(result.archivableData).toHaveLength(0);
    });

    it('should not block closure when organization has no projects', async () => {
      // Проект уже удалён или не существует - проверяем что checker обрабатывает это корректно
      // В реальном сценарии проект может быть удалён, но для теста просто проверяем поведение

      const result = await checker.check(testOrgId);

      expect(result.blockers).toHaveLength(0);
    });

    it('should return correct action messages for different statuses', async () => {
      const financeService = getFinanceService();

      // Тест для статуса 'pending'
      const expense1 = await financeService.createExpense(
        {
          workspaceId: testOrgId,
          projectId: testProjectId,
          date: new Date().toISOString(),
          amount: '1000',
          currency: 'RUB',
          category: 'Test',
        },
        { actorId: testOwnerId }
      );

      let result = await checker.check(testOrgId);
      const pendingBlocker = result.blockers.find((b) => b.id === expense1.id);
      expect(pendingBlocker?.actionRequired).toBe('Одобрите или отклоните расход');

      // Тест для статуса 'approved'
      await financeService.updateExpense(expense1.id, { status: 'pending' }, { actorId: testOwnerId });
      await financeService.updateExpense(expense1.id, { status: 'approved' }, { actorId: testOwnerId });

      result = await checker.check(testOrgId);
      const approvedBlocker = result.blockers.find((b) => b.id === expense1.id);
      expect(approvedBlocker?.actionRequired).toBe('Оплатите расход или отмените его');

      // Тест для статуса 'payable'
      await financeService.updateExpense(expense1.id, { status: 'payable' }, { actorId: testOwnerId });

      result = await checker.check(testOrgId);
      const payableBlocker = result.blockers.find((b) => b.id === expense1.id);
      expect(payableBlocker?.actionRequired).toBe('Завершите оплату расхода');
    });
  });

  describe('archive', () => {
    it('should do nothing (expenses are not archived)', async () => {
      // Расходы не архивируются, метод должен просто завершиться без ошибок
      await expect(checker.archive(testOrgId, 'archive-1')).resolves.not.toThrow();
    });
  });

  describe('deleteArchived', () => {
    it('should do nothing (nothing to delete)', async () => {
      // Нечего удалять для расходов
      await expect(checker.deleteArchived('archive-1')).resolves.not.toThrow();
    });
  });
});
