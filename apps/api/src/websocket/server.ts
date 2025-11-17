import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import type { WebSocketEvent } from './types';

// Глобальный экземпляр Socket.io сервера
let io: SocketServer | null = null;

// Хранилище подключений пользователей
const userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
const socketUsers = new Map<string, string>(); // socketId -> userId
const socketProjects = new Map<string, Set<string>>(); // socketId -> Set<projectId>

export interface WebSocketServerOptions {
  httpServer: HTTPServer;
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
}

export function createWebSocketServer(options: WebSocketServerOptions): SocketServer {
  if (io) {
    return io;
  }

  io = new SocketServer(options.httpServer, {
    cors: options.cors || {
      origin: process.env.NEXT_PUBLIC_WS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Аутентификация через handshake
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (!userId) {
      console.warn(`[WebSocket] Client ${socket.id} connected without userId, disconnecting`);
      socket.disconnect();
      return;
    }

    // Сохраняем связь socketId -> userId
    socketUsers.set(socket.id, userId);
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketProjects.set(socket.id, new Set());

    // Подключение к проекту
    socket.on('join-project', (projectId: string) => {
      if (typeof projectId !== 'string' || !projectId) {
        return;
      }

      socket.join(`project:${projectId}`);
      const projects = socketProjects.get(socket.id);
      if (projects) {
        projects.add(projectId);
      }
      console.log(`[WebSocket] Socket ${socket.id} joined project ${projectId}`);
    });

    // Отключение от проекта
    socket.on('leave-project', (projectId: string) => {
      if (typeof projectId !== 'string' || !projectId) {
        return;
      }

      socket.leave(`project:${projectId}`);
      const projects = socketProjects.get(socket.id);
      if (projects) {
        projects.delete(projectId);
      }
      console.log(`[WebSocket] Socket ${socket.id} left project ${projectId}`);
    });

    // Отключение клиента
    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
      }
      socketUsers.delete(socket.id);
      socketProjects.delete(socket.id);
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error: Error) => {
      console.error(`[WebSocket] Error on socket ${socket.id}:`, error);
    });
  });

  return io;
}

export function getWebSocketServer(): SocketServer | null {
  return io;
}

// Рассылка события в комнату проекта
export function broadcastToProject(projectId: string, event: WebSocketEvent): void {
  if (!io) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast');
    return;
  }

  io.to(`project:${projectId}`).emit('event', event);
  console.log(`[WebSocket] Broadcasted ${event.type} to project ${projectId}`);
}

// Рассылка события конкретному пользователю
export function broadcastToUser(userId: string, event: WebSocketEvent): void {
  if (!io) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast');
    return;
  }

  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  sockets.forEach((socketId) => {
    io!.to(socketId).emit('event', event);
  });

  console.log(`[WebSocket] Broadcasted ${event.type} to user ${userId}`);
}

// Рассылка события всем подключенным клиентам
export function broadcastToAll(event: WebSocketEvent): void {
  if (!io) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast');
    return;
  }

  io.emit('event', event);
  console.log(`[WebSocket] Broadcasted ${event.type} to all clients`);
}

