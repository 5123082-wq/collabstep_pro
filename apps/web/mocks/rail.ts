import { Bell, ListTodo, MessageSquare, PlusCircle, UserPlus } from 'lucide-react';
import AssistantIcon from '@/components/right-rail/AssistantIcon';
import type { QuickAction } from '@/types/quickActions';

export const defaultRailConfig: QuickAction[] = [
  {
    id: 'newProject',
    label: 'Новый проект',
    icon: PlusCircle,
    intent: 'route',
    payload: { to: '/pm/projects/create' },
    section: 'actions'
  },
  {
    id: 'addTask',
    label: 'Добавить задачу',
    icon: ListTodo,
    intent: 'sheet',
    payload: { sheet: 'task' },
    section: 'actions'
  },
  {
    id: 'invite',
    label: 'Пригласить',
    icon: UserPlus,
    intent: 'dialog',
    payload: { dialog: 'invite' },
    section: 'actions'
  },
  {
    id: 'chats',
    label: 'Чаты',
    icon: MessageSquare,
    intent: 'command',
    payload: { command: 'open-chats-modal' },
    section: 'communication',
    badgeSelector: (state) => {
      const casted = state as { ui?: { unreadChats?: number } };
      return casted.ui?.unreadChats ?? 0;
    }
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: Bell,
    intent: 'command',
    payload: { command: 'open-chats-modal', tab: 'notifications' },
    section: 'communication',
    badgeSelector: (state) => {
      const casted = state as { ui?: { unreadNotifications?: number } };
      return casted.ui?.unreadNotifications ?? 0;
    }
  },
  {
    id: 'assistant',
    label: 'Помощник',
    icon: AssistantIcon,
    intent: 'sheet',
    payload: { sheet: 'assistant' },
    section: 'assistant'
  }
];
