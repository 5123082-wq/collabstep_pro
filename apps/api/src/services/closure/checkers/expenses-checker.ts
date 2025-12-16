import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ClosureBlocker,
} from '../types';
import { dbProjectsRepository } from '../../../repositories/db-projects-repository';
import { getExpenseStore } from '../../../stores/expense-store-factory';
import type { ExpenseStatus } from '../../../types';

/**
 * Checker для модуля расходов
 * Блокирует закрытие организации при наличии незакрытых расходов
 */
export class ExpensesClosureChecker implements OrganizationClosureChecker {
  moduleId = 'expenses';
  moduleName = 'Расходы';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const blockers: ClosureBlocker[] = [];

    // Найти все проекты организации
    const projects = await dbProjectsRepository.findByOrganization(
      organizationId
    );

    if (projects.length === 0) {
      return {
        moduleId: this.moduleId,
        moduleName: this.moduleName,
        blockers: [],
        archivableData: [],
      };
    }

    // Статусы расходов, которые блокируют закрытие
    const blockingStatuses: ExpenseStatus[] = [
      'pending',
      'approved',
      'payable',
    ];

    // Найти все расходы проектов организации
    const expenseStore = getExpenseStore();
    const allExpenses: Array<{ expense: import('../../../types').Expense; projectId: string }> = [];

    for (const project of projects) {
      const expenses = await expenseStore.list({ projectId: project.id });
      for (const expense of expenses) {
        allExpenses.push({ expense, projectId: project.id });
      }
    }

    // Фильтровать расходы с блокирующими статусами
    const blockingExpenses = allExpenses.filter((item) =>
      blockingStatuses.includes(item.expense.status)
    );

    for (const item of blockingExpenses) {
      const { expense } = item;
      const amount = expense.amount;

      blockers.push({
        moduleId: this.moduleId,
        type: 'financial',
        severity: 'blocking',
        id: expense.id,
        title: 'Незакрытый расход',
        description: `Расход на ${amount} ${expense.currency} в статусе '${expense.status}'`,
        actionRequired: this.getActionForStatus(expense.status),
        actionUrl: `/expenses/${expense.id}`,
      });
    }

    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers,
      archivableData: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // Расходы не архивируются - они либо блокируют, либо уже закрыты
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteArchived(_archiveId: string): Promise<void> {
    // Нечего удалять
  }

  private getActionForStatus(status: ExpenseStatus): string {
    switch (status) {
      case 'pending':
        return 'Одобрите или отклоните расход';
      case 'approved':
        return 'Оплатите расход или отмените его';
      case 'payable':
        return 'Завершите оплату расхода';
      default:
        return 'Закройте расход';
    }
  }
}
