import { getDemoSessionFromCookies } from './demo-session.server';
import { db } from '@collabverse/api/db/config';
import { userControls } from '@collabverse/api/db/schema';
import { eq } from 'drizzle-orm';
import { isDemoAdminEmail } from './demo-session';

const hasDbConnection = !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
const isDbStorage = process.env.AUTH_STORAGE === 'db' && hasDbConnection;

/**
 * Проверяет, является ли текущий пользователь администратором.
 * Проверяет:
 * 1. Роль в сессии (для обратной совместимости)
 * 2. Роли из базы данных (productAdmin или featureAdmin)
 * 3. Email демо-администратора
 */
export async function isAdminUser(): Promise<boolean> {
  const session = getDemoSessionFromCookies();
  if (!session) {
    return false;
  }

  // Проверка по email демо-администратора
  if (isDemoAdminEmail(session.email)) {
    return true;
  }

  // Проверка роли в сессии (для обратной совместимости)
  if (session.role === 'admin') {
    return true;
  }

  // Проверка ролей из базы данных (если используется БД)
  if (isDbStorage) {
    try {
      const [control] = await db.select().from(userControls).where(eq(userControls.userId, session.userId)).limit(1);
      if (control && control.roles && Array.isArray(control.roles)) {
        // Если у пользователя есть productAdmin или featureAdmin, он администратор
        if (control.roles.includes('productAdmin') || control.roles.includes('featureAdmin')) {
          return true;
        }
      }
    } catch (error) {
      console.error('[check-admin-role] Error checking user controls:', error);
      // В случае ошибки возвращаем false
    }
  }

  return false;
}
