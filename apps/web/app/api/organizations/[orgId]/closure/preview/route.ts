import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationClosureService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * GET /api/organizations/[orgId]/closure/preview
 * Получить preview закрытия организации
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    const preview = await organizationClosureService.getClosurePreview(orgId, user.id);
    return jsonOk(preview);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Обработка специфичных ошибок
    if (errorMessage.includes('not found')) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: `Organization with id '${orgId}' does not exist`,
      });
    }
    
    if (errorMessage.includes('Only organization owner')) {
      return jsonError('FORBIDDEN', {
        status: 403,
        details: 'Only organization owner can close organization',
      });
    }
    
    if (errorMessage.includes('already closed')) {
      return jsonError('ALREADY_CLOSED', {
        status: 409,
        details: 'Organization is already closed',
      });
    }

    console.error('[Organization Closure Preview] Error:', error);
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
