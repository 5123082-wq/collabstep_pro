import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationClosureService } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { z } from 'zod';

const InitiateClosureSchema = z.object({
  reason: z.string().optional(),
});

/**
 * POST /api/organizations/[orgId]/closure/initiate
 * Инициировать закрытие организации
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { orgId } = params;

  try {
    // Парсинг body
    let body: { reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body может быть пустым
      body = {};
    }

    // Валидация body
    const validation = InitiateClosureSchema.safeParse(body);
    if (!validation.success) {
      return jsonError('INVALID_REQUEST', {
        status: 400,
        details: 'Invalid request body format',
      });
    }

    const result = await organizationClosureService.initiateClosing(
      orgId,
      user.id,
      validation.data.reason
    );

    return jsonOk(result);
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
    
    if (errorMessage.includes('cannot be closed due to active blockers')) {
      // Получаем preview для извлечения списка блокеров
      try {
        const preview = await organizationClosureService.getClosurePreview(orgId, user.id);
        const blockersInfo = preview.blockers.map((b) => `${b.moduleId}: ${b.title}`).join(', ');
        return jsonError('CANNOT_CLOSE', {
          status: 400,
          details: `Organization cannot be closed due to active blockers: ${blockersInfo}`,
        });
      } catch {
        // Если не удалось получить preview, возвращаем общую ошибку
        return jsonError('CANNOT_CLOSE', {
          status: 400,
          details: 'Organization cannot be closed due to active blockers',
        });
      }
    }

    console.error('[Organization Closure Initiate] Error:', error);
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
