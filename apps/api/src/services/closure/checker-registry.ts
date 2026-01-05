import type {
  OrganizationClosureChecker,
  ClosureCheckResult,
} from './types';

/**
 * Реестр всех Closure Checkers
 * Координирует работу всех модулей при проверке и закрытии организации
 */
export class ClosureCheckerRegistry {
  private checkers: Map<string, OrganizationClosureChecker> = new Map();

  /**
   * Зарегистрировать checker для модуля
   */
  register(checker: OrganizationClosureChecker): void {
    if (this.checkers.has(checker.moduleId)) {
      console.warn(
        `[ClosureCheckerRegistry] Checker for module '${checker.moduleId}' already registered. Overwriting.`
      );
    }
    this.checkers.set(checker.moduleId, checker);
  }

  /**
   * Запустить проверки всех зарегистрированных checkers
   * Возвращает результаты всех проверок
   */
  async runAllChecks(organizationId: string): Promise<ClosureCheckResult[]> {
    const results: ClosureCheckResult[] = [];

    for (const checker of this.checkers.values()) {
      try {
        const result = await checker.check(organizationId);
        results.push(result);
      } catch (error) {
        console.error(
          `[ClosureCheckerRegistry] Error in ${checker.moduleId}:`,
          error
        );
        // Продолжаем работу других checkers даже если один упал
        // Возвращаем пустой результат для этого модуля
        results.push({
          moduleId: checker.moduleId,
          moduleName: checker.moduleName,
          blockers: [],
          archivableData: [],
        });
      }
    }

    return results;
  }

  /**
   * Архивировать данные через все checkers
   * Вызывается после создания OrganizationArchive, перед удалением данных
   */
  async archiveAll(
    organizationId: string,
    archiveId: string
  ): Promise<void> {
    for (const checker of this.checkers.values()) {
      try {
        await checker.archive(organizationId, archiveId);
      } catch (error) {
        console.error(
          `[ClosureCheckerRegistry] Archive error in ${checker.moduleId}:`,
          error
        );
        // Продолжаем архивацию других модулей
      }
    }
  }

  /**
   * Удалить архивированные данные через все checkers
   * Вызывается когда архив истекает (через 30 дней)
   */
  async deleteAllArchived(archiveId: string): Promise<void> {
    for (const checker of this.checkers.values()) {
      try {
        await checker.deleteArchived(archiveId);
      } catch (error) {
        console.error(
          `[ClosureCheckerRegistry] Delete error in ${checker.moduleId}:`,
          error
        );
        // Продолжаем удаление других модулей
      }
    }
  }

  /**
   * Получить список всех зарегистрированных модулей
   */
  getRegisteredModules(): string[] {
    return Array.from(this.checkers.keys());
  }
}










