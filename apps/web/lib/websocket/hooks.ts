'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from './client';
import type { WebSocketEvent, WebSocketEventType } from './types';

export interface UseWebSocketOptions {
  projectId?: string | null;
  enabled?: boolean;
  onEvent?: (event: WebSocketEvent) => void;
}

export interface UseWebSocketReturn {
  connected: boolean;
  events: WebSocketEvent[];
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

/**
 * Hook для подключения к WebSocket и получения событий проекта
 */
export function useWebSocket(
  userId: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { projectId, enabled = true, onEvent } = options;
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const onEventRef = useRef(onEvent);
  const currentProjectIdRef = useRef<string | null>(null);

  // Обновляем ref при изменении onEvent
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Подключение к WebSocket
  useEffect(() => {
    if (!enabled || !userId || typeof window === 'undefined') {
      return;
    }

    // Проверяем, включен ли WebSocket перед подключением
    if (wsClient.isWebSocketEnabled()) {
      wsClient.connect(userId);
    } else {
      // WebSocket отключен, работаем только через polling
      setConnected(false);
      return;
    }

    const checkConnection = () => {
      setConnected(wsClient.isConnected());
    };

    // Проверяем подключение периодически
    const interval = setInterval(checkConnection, 1000);
    checkConnection();

    return () => {
      clearInterval(interval);
    };
  }, [userId, enabled]);

  // Подписка на события
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = wsClient.onEvent((event) => {
      setEvents((prev) => [...prev, event]);
      
      if (onEventRef.current) {
        onEventRef.current(event);
      }
    });

    return unsubscribe;
  }, [enabled]);

  // Подключение/отключение от проекта
  useEffect(() => {
    if (!enabled || !projectId) {
      if (currentProjectIdRef.current) {
        wsClient.leaveProject(currentProjectIdRef.current);
        currentProjectIdRef.current = null;
      }
      return;
    }

    if (currentProjectIdRef.current !== projectId) {
      // Отключаемся от предыдущего проекта
      if (currentProjectIdRef.current) {
        wsClient.leaveProject(currentProjectIdRef.current);
      }

      // Подключаемся к новому проекту
      wsClient.joinProject(projectId);
      currentProjectIdRef.current = projectId;
    }

    return () => {
      if (currentProjectIdRef.current === projectId) {
        wsClient.leaveProject(projectId);
        currentProjectIdRef.current = null;
      }
    };
  }, [projectId, enabled]);

  const joinProject = useCallback((newProjectId: string) => {
    if (currentProjectIdRef.current) {
      wsClient.leaveProject(currentProjectIdRef.current);
    }
    wsClient.joinProject(newProjectId);
    currentProjectIdRef.current = newProjectId;
  }, []);

  const leaveProject = useCallback((projectIdToLeave: string) => {
    wsClient.leaveProject(projectIdToLeave);
    if (currentProjectIdRef.current === projectIdToLeave) {
      currentProjectIdRef.current = null;
    }
  }, []);

  return {
    connected,
    events,
    joinProject,
    leaveProject
  };
}

/**
 * Hook для подписки на конкретный тип событий
 */
export function useProjectEvents(
  projectId: string | null,
  userId: string | null,
  eventType: WebSocketEventType,
  callback?: (event: WebSocketEvent) => void
): boolean {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!userId || !projectId || typeof window === 'undefined') {
      return;
    }

    // Проверяем, включен ли WebSocket перед подключением
    if (!wsClient.isWebSocketEnabled()) {
      setConnected(false);
      return;
    }

    wsClient.connect(userId);
    wsClient.joinProject(projectId);

    const checkConnection = () => {
      setConnected(wsClient.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
    checkConnection();

    return () => {
      clearInterval(interval);
    };
  }, [userId, projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const unsubscribe = wsClient.onEventType(eventType, (event) => {
      if (event.projectId === projectId && callbackRef.current) {
        callbackRef.current(event);
      }
    });

    return unsubscribe;
  }, [projectId, eventType]);

  return connected;
}

