import { organizationArchivesRepository } from '../../repositories/organization-archives-repository';
import { organizationsRepository } from '../../repositories/organizations-repository';
import { closureCheckerRegistry } from './index';

/**
 * Cron job для очистки просроченных архивов
 * Удаляет архивы, у которых истёк срок хранения (expiresAt < now)
 * 
 * Расписание: Ежедневно в 3:00 AM
 * 
 * Процесс:
 * 1. Находит все просроченные архивы со статусом 'active'
 * 2. Для каждого архива:
 *    - Уведомляет владельца (TODO: реализовать notification service)
 *    - Удаляет данные через все closure checkers
 *    - Помечает архив как удалённый
 *    - Устанавливает статус организации в 'deleted'
 */
export async function cleanupExpiredArchives(): Promise<{
  processed: number;
  deleted: number;
  errors: number;
}> {
  const stats = {
    processed: 0,
    deleted: 0,
    errors: 0,
  };

  try {
    // 1. Найти все просроченные архивы
    const expiredArchives = await organizationArchivesRepository.findExpired();

    console.log(
      `[ArchiveCleanup] Found ${expiredArchives.length} expired archives`
    );

    for (const archive of expiredArchives) {
      stats.processed++;

      try {
        // 2. Уведомить владельца (TODO: реализовать notification service)
        // await notificationService.send(archive.ownerId, {
        //   type: 'archive_deleted',
        //   title: 'Архив организации удалён',
        //   message: `Архив "${archive.organizationName}" был удалён.`,
        // });
        console.log(
          `[ArchiveCleanup] TODO: Send notification to owner ${archive.ownerId}`
        );

        // 3. Удалить данные через все checkers
        await closureCheckerRegistry.deleteAllArchived(archive.id);

        // 4. Пометить архив как удалённый
        await organizationArchivesRepository.markDeleted(archive.id);

        // 5. Установить org.status = 'deleted'
        await organizationsRepository.update(archive.organizationId, {
          status: 'deleted',
        });

        stats.deleted++;

        console.log(
          `[ArchiveCleanup] Successfully deleted archive ${archive.id} for organization ${archive.organizationId}`
        );
      } catch (error) {
        stats.errors++;
        console.error(
          `[ArchiveCleanup] Error deleting archive ${archive.id}:`,
          error
        );
        // Продолжаем с другими архивами
      }
    }

    console.log(
      `[ArchiveCleanup] Completed: processed=${stats.processed}, deleted=${stats.deleted}, errors=${stats.errors}`
    );

    return stats;
  } catch (error) {
    console.error('[ArchiveCleanup] Fatal error:', error);
    throw error;
  }
}
