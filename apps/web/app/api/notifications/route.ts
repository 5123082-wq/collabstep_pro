import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { notificationsRepository, type NotificationStatus } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const sizeParam = Number(url.searchParams.get('pageSize') ?? '20');
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(sizeParam) ? sizeParam : 20));
  return { page, pageSize };
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as NotificationStatus | null;
  const { page, pageSize } = parsePagination(url);

  const notifications = notificationsRepository.listByUser(auth.userId, {
    status: status ?? undefined,
    page,
    pageSize
  });

  // Получаем общее количество для пагинации
  const allNotifications = notificationsRepository.listByUser(auth.userId, {
    status: status ?? undefined
  });
  const total = allNotifications.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return jsonOk({
    notifications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
}

