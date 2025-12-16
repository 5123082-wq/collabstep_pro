import {
  OrganizationClosureChecker,
  ClosureCheckResult,
} from '../types';

/**
 * Заглушка для модуля маркетинга
 * TODO: Реализовать когда будет модуль маркетинга
 *
 * Блокеры могут включать:
 * - Активные рекламные кампании с оплатой
 * - Запущенные email-рассылки
 * - Подписки на маркетинговые инструменты
 */
export class MarketingClosureChecker implements OrganizationClosureChecker {
  moduleId = 'marketing';
  moduleName = 'Маркетинг';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(_organizationId: string): Promise<ClosureCheckResult> {
    // TODO: Реализовать проверку активных маркетинговых активностей
    // Пример блокеров:
    // - Активная рекламная кампания в Google Ads (оплачена)
    // - Запущенная email-рассылка (подписка активна)
    // - Интеграция с CRM (платная подписка)

    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      blockers: [],
      archivableData: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async archive(_organizationId: string, _archiveId: string): Promise<void> {
    // TODO: Архивировать данные маркетинга:
    // - История кампаний
    // - Статистика рассылок
    // - Настройки интеграций
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteArchived(_archiveId: string): Promise<void> {
    // TODO: Удалить архивированные данные маркетинга
  }
}
