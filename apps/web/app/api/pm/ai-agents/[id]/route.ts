import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { aiAgentsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Проверка прав админа
  if (!isDemoAdminEmail(auth.email)) {
    return jsonError('ACCESS_DENIED', { status: 403 });
  }

  const agent = aiAgentsRepository.findById(params.id);
  if (!agent) {
    return jsonError('AGENT_NOT_FOUND', { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, title, responseTemplates, behavior } = body;

    const updates: {
      name?: string;
      title?: string;
      responseTemplates?: string[];
      behavior?: {
        autoRespond?: boolean;
        responseStyle?: 'short' | 'detailed';
      };
    } = {};

    if (name !== undefined) {
      updates.name = name;
    }
    if (title !== undefined) {
      updates.title = title;
    }
    if (responseTemplates !== undefined) {
      if (!Array.isArray(responseTemplates)) {
        return jsonError('INVALID_REQUEST', { status: 400 });
      }
      updates.responseTemplates = responseTemplates;
    }
    if (behavior !== undefined) {
      updates.behavior = behavior;
    }

    const updated = aiAgentsRepository.update(params.id, updates);
    if (!updated) {
      return jsonError('UPDATE_FAILED', { status: 500 });
    }

    return jsonOk({ agent: updated });
  } catch (error) {
    console.error('Error updating agent:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

