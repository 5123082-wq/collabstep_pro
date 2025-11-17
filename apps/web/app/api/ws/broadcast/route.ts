import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { broadcastToProject, broadcastToUser } from '@/lib/websocket/event-broadcaster';
import type { WebSocketEventType } from '@/lib/websocket/types';

/**
 * API endpoint для рассылки событий через WebSocket
 * Используется для отправки событий из API routes
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, projectId, userId, data } = body;

    if (!type || !(projectId || userId)) {
      return jsonError('INVALID_REQUEST', { status: 400 });
    }

    if (projectId) {
      await broadcastToProject(projectId, type as WebSocketEventType, data);
    } else if (userId) {
      await broadcastToUser(userId, type as WebSocketEventType, data, projectId);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error('[WebSocket] Broadcast error:', error);
    return jsonError('INTERNAL_ERROR', { status: 500 });
  }
}

