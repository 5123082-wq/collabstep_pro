import { NextRequest } from 'next/server';
import { sendExpiryNotifications } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * POST /api/cron/archive-expiry-notifications
 * Cron job для отправки уведомлений об истечении архивов
 * 
 * Вызывается автоматически Vercel Cron по расписанию: ежедневно в 9:00 AM
 * 
 * Аутентификация:
 * - Vercel Cron автоматически добавляет заголовок `authorization` с секретом
 * - Секрет проверяется через переменную окружения `CRON_SECRET`
 */
export async function POST(request: NextRequest) {
  // Проверка секрета Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron Archive Expiry Notifications] CRON_SECRET is not configured');
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: 'Cron secret is not configured',
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Archive Expiry Notifications] Unauthorized request', {
      authHeader: authHeader ? 'present' : 'missing',
    });
    return jsonError('UNAUTHORIZED', {
      status: 401,
      details: 'Invalid cron secret',
    });
  }

  try {
    console.log('[Cron Archive Expiry Notifications] Starting notifications job');
    const result = await sendExpiryNotifications();

    console.log('[Cron Archive Expiry Notifications] Job completed', result);

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Archive Expiry Notifications] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}

/**
 * GET /api/cron/archive-expiry-notifications
 * Ручной вызов для тестирования (только в dev режиме)
 */
export async function GET() {
  // Разрешаем только в dev режиме
  if (process.env.NODE_ENV === 'production') {
    return jsonError('FORBIDDEN', {
      status: 403,
      details: 'Manual execution is not allowed in production',
    });
  }

  // В dev режиме можно вызвать без секрета
  try {
    console.log('[Cron Archive Expiry Notifications] Manual execution (dev mode)');
    const result = await sendExpiryNotifications();

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      mode: 'manual-dev',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Archive Expiry Notifications] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
