import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, marketplaceListingsRepository } from '@collabverse/api';
import { trackEvent } from '@/lib/telemetry';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверяем, нет ли уже листинга для этого проекта
    const existingListing = marketplaceListingsRepository.findByProjectId(params.id);
    if (existingListing) {
      return jsonError(
        `Листинг для проекта "${project.title}" уже существует (ID: ${existingListing.id}). Используйте PATCH для обновления.`,
        { status: 409 }
      );
    }

    // Валидация данных проекта
    if (!project.title || project.title.trim().length === 0) {
      return jsonError('Название проекта обязательно для создания листинга', { status: 400 });
    }

    if (project.title.trim().length < 3) {
      return jsonError('Название проекта должно содержать минимум 3 символа', { status: 400 });
    }

    // Создаём черновик листинга
    const listing = marketplaceListingsRepository.create({
      projectId: params.id,
      workspaceId: project.workspaceId,
      title: project.title,
      ...(project.description && { description: project.description }),
      state: 'draft'
    });

    // Аналитика события
    trackEvent('pm_publish_started', {
      workspaceId: project.workspaceId,
      projectId: params.id,
      userId: auth.userId,
      listingId: listing.id,
      source: 'api'
    });

    return jsonOk({ listing });
  } catch (error) {
    console.error('[listings] Error creating listing:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Не удалось создать листинг',
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверяем, существует ли листинг
    const existingListing = marketplaceListingsRepository.findByProjectId(params.id);
    if (!existingListing) {
      return jsonError('Листинг не найден. Используйте POST для создания нового листинга.', { status: 404 });
    }

    const body = await req.json();
    const { title, description, state } = body;

    // Валидация
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return jsonError('Название не может быть пустым', { status: 400 });
      }
      if (title.trim().length < 3) {
        return jsonError('Название должно содержать минимум 3 символа', { status: 400 });
      }
    }

    if (state !== undefined && !['draft', 'published', 'rejected'].includes(state)) {
      return jsonError('Недопустимое состояние. Допустимые значения: draft, published, rejected', { status: 400 });
    }

    // Обновляем листинг
    const updatedListing = marketplaceListingsRepository.update(existingListing.id, {
      title: title !== undefined ? title : existingListing.title,
      description: description !== undefined ? description : existingListing.description,
      state: state !== undefined ? state : existingListing.state
    });

    // Аналитика события
    trackEvent('pm_listing_updated', {
      workspaceId: project.workspaceId,
      projectId: params.id,
      userId: auth.userId,
      listingId: existingListing.id,
      source: 'api'
    });

    return jsonOk({ listing: updatedListing });
  } catch (error) {
    console.error('[listings] Error updating listing:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Не удалось обновить листинг',
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!flags.PM_PROJECT_CARD) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const role = getProjectRole(params.id, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  try {
    const project = projectsRepository.findById(params.id);
    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', { status: 404 });
    }

    // Проверяем, существует ли листинг
    const existingListing = marketplaceListingsRepository.findByProjectId(params.id);
    if (!existingListing) {
      return jsonError('Листинг не найден или уже удалён', { status: 404 });
    }

    // Удаляем листинг
    const deleted = marketplaceListingsRepository.delete(existingListing.id);
    if (!deleted) {
      return jsonError('Не удалось удалить листинг', { status: 500 });
    }

    // Аналитика события
    trackEvent('pm_listing_deleted', {
      workspaceId: project.workspaceId,
      projectId: params.id,
      userId: auth.userId,
      listingId: existingListing.id,
      source: 'api'
    });

    return jsonOk({ success: true, message: 'Листинг успешно удалён' });
  } catch (error) {
    console.error('[listings] Error deleting listing:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Не удалось удалить листинг',
      { status: 400 }
    );
  }
}

