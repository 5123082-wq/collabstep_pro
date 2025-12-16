import { organizationArchivesRepository } from '../../repositories/organization-archives-repository';

/**
 * Форматирует дату для отображения пользователю
 * Используется в уведомлениях (пока закомментировано до реализации notification service)
 * Экспортирована для будущего использования
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Cron job для отправки уведомлений об истечении архивов
 * Отправляет уведомления владельцам архивов перед их удалением
 * 
 * Расписание: Ежедневно в 9:00 AM
 * 
 * Процесс:
 * 1. Находит архивы, которые истекают через 7 дней
 * 2. Отправляет уведомления владельцам
 * 3. Находит архивы, которые истекают через 1 день
 * 4. Отправляет уведомления владельцам
 */
export async function sendExpiryNotifications(): Promise<{
  notified7Days: number;
  notified1Day: number;
  errors: number;
}> {
  const stats = {
    notified7Days: 0,
    notified1Day: 0,
    errors: 0,
  };

  try {
    // 1. Найти архивы, которые истекают через 7 дней
    const archivesExpiringIn7Days =
      await organizationArchivesRepository.findExpiringIn(7);

    console.log(
      `[ArchiveExpiryNotifications] Found ${archivesExpiringIn7Days.length} archives expiring in 7 days`
    );

    for (const archive of archivesExpiringIn7Days) {
      try {
        // TODO: реализовать notification service
        // await notificationService.send(archive.ownerId, {
        //   type: 'archive_expiring_soon',
        //   title: 'Архив будет удалён через 7 дней',
        //   message: `Архив "${archive.organizationName}" будет удалён ${formatDate(archive.expiresAt)}.`,
        // });
        console.log(
          `[ArchiveExpiryNotifications] TODO: Send 7-day notification to owner ${archive.ownerId} for archive ${archive.id}`
        );
        stats.notified7Days++;
      } catch (error) {
        stats.errors++;
        console.error(
          `[ArchiveExpiryNotifications] Error sending 7-day notification for archive ${archive.id}:`,
          error
        );
      }
    }

    // 2. Найти архивы, которые истекают через 1 день
    const archivesExpiringIn1Day =
      await organizationArchivesRepository.findExpiringIn(1);

    console.log(
      `[ArchiveExpiryNotifications] Found ${archivesExpiringIn1Day.length} archives expiring in 1 day`
    );

    for (const archive of archivesExpiringIn1Day) {
      try {
        // TODO: реализовать notification service
        // await notificationService.send(archive.ownerId, {
        //   type: 'archive_expiring_tomorrow',
        //   title: 'Архив будет удалён завтра',
        //   message: `Архив "${archive.organizationName}" будет удалён завтра.`,
        // });
        console.log(
          `[ArchiveExpiryNotifications] TODO: Send 1-day notification to owner ${archive.ownerId} for archive ${archive.id}`
        );
        stats.notified1Day++;
      } catch (error) {
        stats.errors++;
        console.error(
          `[ArchiveExpiryNotifications] Error sending 1-day notification for archive ${archive.id}:`,
          error
        );
      }
    }

    console.log(
      `[ArchiveExpiryNotifications] Completed: 7-day=${stats.notified7Days}, 1-day=${stats.notified1Day}, errors=${stats.errors}`
    );

    return stats;
  } catch (error) {
    console.error('[ArchiveExpiryNotifications] Fatal error:', error);
    throw error;
  }
}
