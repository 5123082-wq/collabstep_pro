import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  organizationArchivesRepository,
  archivedDocumentsRepository,
} from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * GET /api/archives/[archiveId]
 * Получить детальную информацию об архиве и список документов
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { archiveId: string } }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { archiveId } = params;

  try {
    // Найти архив
    const archive = await organizationArchivesRepository.findById(archiveId);
    if (!archive) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'Archive not found',
      });
    }

    // Проверить права доступа (только владелец может просматривать архив)
    if (archive.ownerId !== user.id) {
      return jsonError('FORBIDDEN', {
        status: 403,
        details: "You don't have access to this archive",
      });
    }

    // Проверить, что архив не истёк и не удалён
    const now = new Date();
    const expiresAt = new Date(archive.expiresAt);
    if (archive.status !== 'active' || expiresAt < now) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'Archive not found or expired',
      });
    }

    // Получить документы архива
    const documents = await archivedDocumentsRepository.findByArchive(archiveId);

    return jsonOk({
      archive,
      documents,
    });
  } catch (error) {
    console.error('[Archive Details] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: errorMessage,
    });
  }
}
