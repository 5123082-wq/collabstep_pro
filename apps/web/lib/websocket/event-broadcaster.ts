/**
 * Сервис для рассылки событий через WebSocket
 * Используется на сервере (в API routes) для отправки событий клиентам
 */

import type { WebSocketEvent, WebSocketEventType } from './types';

// Используем прямой импорт функций сервера из apps/api
// Это работает, так как мы в монорепо
let serverBroadcast: {
  broadcastToProject: (projectId: string, event: WebSocketEvent) => void;
  broadcastToUser: (userId: string, event: WebSocketEvent) => void;
} | null = null;

// Ленивая загрузка функций сервера
async function getServerBroadcast() {
  if (serverBroadcast) {
    return serverBroadcast;
  }

  if (typeof window !== 'undefined') {
    // Клиентская сторона - не используем серверные функции
    return null;
  }

  try {
    // Динамический импорт для избежания проблем с SSR
    const wsModule = await import('@collabverse/api/websocket');
    serverBroadcast = {
      broadcastToProject: wsModule.broadcastToProject,
      broadcastToUser: wsModule.broadcastToUser
    };
    return serverBroadcast;
  } catch (error) {
    console.warn('[WebSocket] Failed to import server broadcast functions:', error);
    return null;
  }
}

export async function broadcastToProject(
  projectId: string,
  eventType: WebSocketEventType,
  data: WebSocketEvent['data']
): Promise<void> {
  const event: WebSocketEvent = {
    type: eventType,
    projectId,
    data,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    console.warn('[WebSocket] broadcastToProject called on client side');
    return;
  }

  const broadcast = await getServerBroadcast();
  if (broadcast) {
    broadcast.broadcastToProject(projectId, event);
  } else {
    // Fallback: логируем событие
    console.log('[WebSocket] Broadcast event (fallback):', event);
  }
}

export async function broadcastToUser(
  userId: string,
  eventType: WebSocketEventType,
  data: WebSocketEvent['data'],
  projectId?: string
): Promise<void> {
  const event: WebSocketEvent = {
    type: eventType,
    projectId: projectId || '',
    data,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    console.warn('[WebSocket] broadcastToUser called on client side');
    return;
  }

  const broadcast = await getServerBroadcast();
  if (broadcast) {
    broadcast.broadcastToUser(userId, event);
  } else {
    // Fallback: логируем событие
    console.log('[WebSocket] Broadcast event to user (fallback):', event);
  }
}
