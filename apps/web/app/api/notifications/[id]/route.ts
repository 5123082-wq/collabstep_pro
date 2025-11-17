import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { notificationsRepository } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const notification = notificationsRepository.findById(params.id);
  if (!notification || notification.userId !== auth.userId) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const updated = notificationsRepository.markAsRead(params.id);
  if (!updated) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  return jsonOk({ notification: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const notification = notificationsRepository.findById(params.id);
  if (!notification || notification.userId !== auth.userId) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  const deleted = notificationsRepository.delete(params.id);
  if (!deleted) {
    return jsonError('NOT_FOUND', { status: 404 });
  }

  return jsonOk({ success: true });
}

