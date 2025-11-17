// Типы событий WebSocket

export type WebSocketEventType =
  | 'task.updated'
  | 'task.created'
  | 'task.deleted'
  | 'comment.added'
  | 'comment.updated'
  | 'chat.message'
  | 'notification.new';

export interface WebSocketEvent {
  type: WebSocketEventType;
  projectId: string;
  data: any;
  timestamp: string;
}

export interface WebSocketClientEvent {
  'join-project': (projectId: string) => void;
  'leave-project': (projectId: string) => void;
  event: (event: WebSocketEvent) => void;
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
}

