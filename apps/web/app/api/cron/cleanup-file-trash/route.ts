import { NextRequest } from 'next/server';
import { cleanupExpiredFileTrash } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * POST /api/cron/cleanup-file-trash
 * Cron job for cleaning up expired files in trash
 * 
 * Called automatically by Vercel Cron on schedule: daily at 3:00 AM
 * 
 * Authentication:
 * - Vercel Cron automatically adds `authorization` header with secret
 * - Secret is verified via CRON_SECRET environment variable
 */
export async function POST(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron Cleanup File Trash] CRON_SECRET is not configured');
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: 'Cron secret is not configured',
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Cleanup File Trash] Unauthorized request', {
      authHeader: authHeader ? 'present' : 'missing',
    });
    return jsonError('UNAUTHORIZED', {
      status: 401,
      details: 'Invalid cron secret',
    });
  }

  try {
    console.log('[Cron Cleanup File Trash] Starting cleanup job');
    const result = await cleanupExpiredFileTrash();

    console.log('[Cron Cleanup File Trash] Job completed', result);

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Cleanup File Trash] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}

/**
 * GET /api/cron/cleanup-file-trash
 * Manual execution for testing (only in dev mode)
 */
export async function GET() {
  // Allow only in dev mode
  if (process.env.NODE_ENV === 'production') {
    return jsonError('FORBIDDEN', {
      status: 403,
      details: 'Manual execution is not allowed in production',
    });
  }

  // In dev mode, can call without secret
  try {
    console.log('[Cron Cleanup File Trash] Manual execution (dev mode)');
    const result = await cleanupExpiredFileTrash();

    return jsonOk({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      mode: 'manual-dev',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron Cleanup File Trash] Error:', error);

    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}

