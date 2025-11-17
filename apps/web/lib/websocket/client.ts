'use client';

import { io, Socket } from 'socket.io-client';
import type { WebSocketEvent, WebSocketEventType } from './types';

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Начальная задержка в мс
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private eventCallbacks: Map<string, Set<(event: WebSocketEvent) => void>> = new Map();
  private allEventCallbacks: Set<(event: WebSocketEvent) => void> = new Set();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
  }

  /**
   * Проверяет, включен ли WebSocket через переменные окружения
   */
  private isEnabled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Проверяем явное отключение
    const wsEnabled = process.env.NEXT_PUBLIC_WS_ENABLED;
    if (wsEnabled === 'false' || wsEnabled === '0' || wsEnabled === 'off') {
      return false;
    }

    // Проверяем наличие URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      return false;
    }

    return true;
  }

  connect(userId: string): void {
    // Проверяем, включен ли WebSocket
    if (!this.isEnabled()) {
      console.log('[WebSocket] WebSocket disabled or URL not configured, using polling fallback');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.isManualDisconnect = false;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL!; // Уже проверили выше

    this.socket = io(wsUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        userId
      },
      reconnection: false // Управляем переподключением вручную
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected:', reason);
      
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect(userId);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error);
      
      if (!this.isManualDisconnect) {
        this.scheduleReconnect(userId);
      }
    });

    this.socket.on('event', (event: WebSocketEvent) => {
      // Вызываем все общие колбэки
      this.allEventCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('[WebSocket] Error in event callback:', error);
        }
      });

      // Вызываем специфичные колбэки для типа события
      const callbacks = this.eventCallbacks.get(event.type);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(event);
          } catch (error) {
            console.error('[WebSocket] Error in event callback:', error);
          }
        });
      }
    });

    this.socket.on('error', (error: Error) => {
      console.error('[WebSocket] Socket error:', error);
    });
  }

  private scheduleReconnect(userId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isManualDisconnect) {
        this.connect(userId);
      }
    }, delay);
  }

  joinProject(projectId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot join project: not connected');
      return;
    }

    this.socket.emit('join-project', projectId);
  }

  leaveProject(projectId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave-project', projectId);
  }

  onEvent(callback: (event: WebSocketEvent) => void): () => void {
    this.allEventCallbacks.add(callback);
    
    return () => {
      this.allEventCallbacks.delete(callback);
    };
  }

  onEventType(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    
    this.eventCallbacks.get(eventType)!.add(callback);
    
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventCallbacks.delete(eventType);
        }
      }
    };
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.eventCallbacks.clear();
    this.allEventCallbacks.clear();
  }

  isConnected(): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  /**
   * Проверяет, включен ли WebSocket (публичный метод для использования в компонентах)
   */
  isWebSocketEnabled(): boolean {
    return this.isEnabled();
  }
}

// Singleton экземпляр клиента
export const wsClient = new WebSocketClient();

