import { useEffect } from 'react';
import { useUI } from '@/stores/ui';
import { wsClient } from '@/lib/websocket/client';

const POLL_INTERVAL = 60000; // 60 секунд (fallback polling)

export function useUnreadNotifications(userId: string | null) {
  const setUnreadNotifications = useUI((state) => state.setUnreadNotifications);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.data) {
            setUnreadNotifications(data.data.count || 0);
          }
        }
      } catch (error) {
        console.error('Error loading unread notifications count:', error);
      }
    };

    // Загружаем сразу
    loadUnreadCount();

    // Подключаемся к WebSocket для real-time обновлений (если включен)
    let unsubscribe: (() => void) | null = null;
    if (wsClient.isWebSocketEnabled()) {
      wsClient.connect(userId);

      // Подписка на события уведомлений
      unsubscribe = wsClient.onEventType('notification.new', (event) => {
        // Обновляем счетчик при получении нового уведомления
        loadUnreadCount();
      });
    }

    // Fallback polling (если WebSocket недоступен)
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, [userId, setUnreadNotifications]);
}

