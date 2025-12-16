import { eq, and, inArray } from 'drizzle-orm';
import { contracts } from '../../../db/schema';
import { db } from '../../../db/config';
import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ClosureBlocker,
} from '../types';
import { centsToAmount } from '../../../utils/money';

/**
 * Checker для модуля контрактов
 * Блокирует закрытие организации при наличии активных контрактов
 */
export class ContractsClosureChecker implements OrganizationClosureChecker {
  moduleId = 'contracts';
  moduleName = 'Контракты';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const blockers: ClosureBlocker[] = [];

    // Найти активные контракты (блокирующие статусы)
    const activeStatuses: Array<
      'accepted' | 'funded' | 'completed' | 'disputed'
    > = ['accepted', 'funded', 'completed', 'disputed'];

    const activeContracts = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.organizationId, organizationId),
          inArray(contracts.status, activeStatuses)
        )
      );

    for (const contract of activeContracts) {
      const amount = centsToAmount(BigInt(contract.amount));
      const actionRequired = this.getActionForStatus(contract.status);

      blockers.push({
        moduleId: this.moduleId,
        type: 'financial',
        severity: 'blocking',
        id: contract.id,
        title: 'Активный контракт',
        description: `Контракт на ${amount} ${contract.currency} (статус: ${contract.status})`,
        actionRequired,
        actionUrl: `/contracts/${contract.id}`,
      });
    }

    // Контракты не архивируются - они либо блокируют, либо уже закрыты
    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers,
      archivableData: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // Контракты не архивируются
    // Они либо блокируют закрытие, либо уже в финальном статусе (paid)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteArchived(_archiveId: string): Promise<void> {
    // Нечего удалять
  }

  private getActionForStatus(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Завершите контракт или отмените его';
      case 'funded':
        return 'Завершите работу по контракту или верните средства';
      case 'completed':
        return 'Оплатите контракт';
      case 'disputed':
        return 'Разрешите спор по контракту';
      default:
        return 'Завершите контракт';
    }
  }
}
