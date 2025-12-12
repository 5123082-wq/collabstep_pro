import { useEffect } from 'react';
import { useUI } from '@/stores/ui';

const POLL_INTERVAL = 60000; // 60 секунд (MVP polling)

export function useUnreadInvites(userId: string | null) {
  const setUnreadInvites = useUI((state) => state.setUnreadInvites);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/invites/unread-count');
        if (response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { ok: true; data?: { count?: number } }
            | { ok: false; error: string }
            | null;
          if (data && data.ok && data.data) {
            setUnreadInvites(data.data.count || 0);
          }
        }
      } catch (error) {
        console.error('Error loading unread invites count:', error);
      }
    };

    void loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [setUnreadInvites, userId]);
}


