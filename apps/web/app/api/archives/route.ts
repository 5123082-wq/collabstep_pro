import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationArchivesRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * GET /api/archives
 * Получить список всех архивов текущего пользователя
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const archives = await organizationArchivesRepository.findByOwner(user.id);
    return jsonOk({ archives });
  } catch (error) {
    console.error('[Archives List] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
