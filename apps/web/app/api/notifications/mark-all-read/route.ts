import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { notificationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const count = notificationsRepository.markAllAsRead(auth.userId);

  return jsonOk({ count });
}

