import {
  OrganizationClosureChecker,
  ClosureCheckResult,
  ClosureBlocker,
} from '../types';
import { walletRepository } from '../../../repositories/wallet-repository';
import { centsToAmount } from '../../../utils/money';

/**
 * Checker для модуля кошелька
 * Блокирует закрытие организации при наличии баланса на кошельке
 */
export class WalletClosureChecker implements OrganizationClosureChecker {
  moduleId = 'wallet';
  moduleName = 'Кошелёк';

  async check(organizationId: string): Promise<ClosureCheckResult> {
    const blockers: ClosureBlocker[] = [];

    // Найти кошелёк организации
    const wallet = await walletRepository.findByEntity(
      organizationId,
      'organization'
    );

    if (wallet && wallet.balance > 0) {
      const balance = centsToAmount(BigInt(wallet.balance));

      blockers.push({
        moduleId: this.moduleId,
        type: 'financial',
        severity: 'blocking',
        id: wallet.id,
        title: 'Баланс кошелька',
        description: `На счету: ${balance} ${wallet.currency}`,
        actionRequired: 'Выведите все средства перед закрытием организации',
        actionUrl: `/wallet`,
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
    // Кошелёк не архивируется
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteArchived(_archiveId: string): Promise<void> {
    // Нечего удалять
  }
}
