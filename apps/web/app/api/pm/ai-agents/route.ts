import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { aiAgentsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  // Получить список всех доступных AI-агентов
  const agents = aiAgentsRepository.list();

  return jsonOk({ agents });
}

