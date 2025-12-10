// Типы событий WebSocket (совпадают с клиентскими)

export type WebSocketEventType =
  | 'task.updated'
  | 'task.created'
  | 'task.deleted'
  | 'comment.added'
  | 'comment.updated'
  | 'comment.deleted'
  | 'chat.message'
  | 'chat.message.deleted'
  | 'notification.new';

export interface WebSocketEvent {
  type: WebSocketEventType;
  projectId: string;
  data: unknown;
  timestamp: string;
}
