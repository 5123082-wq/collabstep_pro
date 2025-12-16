import { NextRequest } from 'next/server';
import { cleanupExpiredArchives } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * POST /api/cron/cleanup-archives
 * Cron job для очистки просроченных архивов организаций
 * 
 * Вызывается автоматически Vercel Cron по расписанию: ежедневно в 3:00 AM
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
    console.error('[Cron Cleanup Archives] CRON_SECRET is not configured');
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: 'Cron secret is not configured',
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Cleanup Archives] Unauthorized request', {
      authHeader: authHeader ? 'present' : 'missing',
    });
    return jsonError('UNAUTHORIZED', {
      status: 401,
      details: 'Invalid cron secret',
    });
  }

  try {
    console.log('[Cron Cleanup Archives] Starting cleanup job');
    const result = await cleanupExpiredArchives();

    console.log('[Cron Cleanup Archives] Job completed', result);

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Cleanup Archives] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}

/**
 * GET /api/cron/cleanup-archives
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
    console.log('[Cron Cleanup Archives] Manual execution (dev mode)');
    const result = await cleanupExpiredArchives();

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      mode: 'manual-dev',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Cleanup Archives] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
