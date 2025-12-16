import type {
  ClosureBlocker,
  ClosureCheckResult,
  ArchivableData,
} from '../../types';

/**
 * Интерфейс для проверщиков закрытия организации
 * Каждый модуль системы должен реализовать этот интерфейс
 */
export interface OrganizationClosureChecker {
  /**
   * Уникальный идентификатор модуля (например, 'contracts', 'documents', 'marketing')
   */
  moduleId: string;

  /**
   * Человекочитаемое название модуля (например, 'Контракты', 'Документы')
   */
  moduleName: string;

  /**
   * Проверить организацию на наличие блокеров и данных для архивации
   * Вызывается при preview закрытия и перед инициированием закрытия
   *
   * @param organizationId - ID организации
   * @returns Результат проверки с блокерами и данными для архивации
   */
  check(organizationId: string): Promise<ClosureCheckResult>;

  /**
   * Архивировать данные модуля
   * Вызывается после создания OrganizationArchive, перед удалением данных
   *
   * @param organizationId - ID организации
   * @param archiveId - ID созданного архива
   */
  archive(organizationId: string, archiveId: string): Promise<void>;

  /**
   * Удалить архивированные данные
   * Вызывается когда архив истекает (через 30 дней)
   *
   * @param archiveId - ID архива
   */
  deleteArchived(archiveId: string): Promise<void>;
}

/**
 * Реэкспорт типов для удобства
 */
export type {
  ClosureBlocker,
  ClosureCheckResult,
  ArchivableData,
};

