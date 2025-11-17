import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { projectsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_ARCHIVE) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(_req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const project = projectsRepository.findById(params.id);
  if (!project) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  // Проверяем, что проект еще не в архиве
  if (project.status === 'archived' || project.archived) {
    return jsonError('ALREADY_ARCHIVED', { status: 400 });
  }

  try {
    const archivedProject = projectsRepository.archive(params.id);
    if (!archivedProject) {
      return jsonError('ARCHIVE_FAILED', { status: 500 });
    }

    return jsonOk({ success: true, project: archivedProject });
  } catch (error) {
    console.error('Error archiving project:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

