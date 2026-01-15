import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonOk } from '@/lib/api/http';
import { performerCasesRepository } from '@collabverse/api';
import { CaseSchema } from '@/lib/schemas/performers';

const DeleteSchema = z.object({
  id: z.string()
});

export async function GET(_request: NextRequest) {
  void _request;
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const items = await performerCasesRepository.listByPerformer(user.id);
    return jsonOk({ items });
  } catch (error) {
    console.error('[Performer Cases API] Error listing:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = CaseSchema.parse(body);

    const created = await performerCasesRepository.create({
      performerId: user.id,
      title: parsed.title,
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.projectId !== undefined ? { projectId: parsed.projectId } : {}),
      ...(parsed.outcome !== undefined ? { outcome: parsed.outcome } : {})
    });

    return jsonOk({ item: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
    }
    console.error('[Performer Cases API] Error creating:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id') || undefined;

  if (!id) {
    try {
      const body = await request.json();
      const parsed = DeleteSchema.parse(body);
      id = parsed.id;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return jsonError('VALIDATION_ERROR', { status: 400, details: JSON.stringify(error.errors) });
      }
      return jsonError('INVALID_REQUEST', { status: 400, details: 'Missing case id' });
    }
  }

  try {
    const item = await performerCasesRepository.findById(id);
    if (!item) {
      return jsonError('NOT_FOUND', { status: 404 });
    }
    if (item.performerId !== user.id) {
      return jsonError('FORBIDDEN', { status: 403 });
    }

    const deleted = await performerCasesRepository.delete(id);
    if (!deleted) {
      return jsonError('DELETE_FAILED', { status: 500 });
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error('[Performer Cases API] Error deleting:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}
