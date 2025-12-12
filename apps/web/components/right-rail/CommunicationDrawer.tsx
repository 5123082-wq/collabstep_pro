'use client';

import { useEffect, useMemo, type SVGProps } from 'react';
import { Bell, MessageSquare, UserPlus } from 'lucide-react';
import ChatPanel from './ChatPanel';
import InvitesPanel from './InvitesPanel';
import NotificationsPanel from './NotificationsPanel';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useUI } from '@/stores/ui';

type CommunicationTab = 'notifications' | 'chats' | 'invites';

type TabDefinition = {
  id: CommunicationTab;
  label: string;
  icon: typeof Bell;
};

const tabs: TabDefinition[] = [
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'chats', label: 'Чаты', icon: MessageSquare },
  { id: 'invites', label: 'Приглашения', icon: UserPlus }
];

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export default function CommunicationDrawer() {
  const drawer = useUI((state) => state.drawer);
  const openDrawer = useUI((state) => state.openDrawer);
  const closeDrawer = useUI((state) => state.closeDrawer);
  const setUnreadChats = useUI((state) => state.setUnreadChats);
  const setUnreadNotifications = useUI((state) => state.setUnreadNotifications);
  const setUnreadInvites = useUI((state) => state.setUnreadInvites);
  const unreadChats = useUI((state) => state.unreadChats);
  const unreadNotifications = useUI((state) => state.unreadNotifications);
  const unreadInvites = useUI((state) => state.unreadInvites);

  const isOpen = drawer === 'notifications' || drawer === 'chats' || drawer === 'invites';
  const activeTab: CommunicationTab = isOpen ? (drawer as CommunicationTab) : 'notifications';

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (activeTab === 'chats') {
      setUnreadChats(0);
    }
    if (activeTab === 'notifications') {
      setUnreadNotifications(0);
    }
    if (activeTab === 'invites') {
      setUnreadInvites(0);
    }
  }, [activeTab, isOpen, setUnreadChats, setUnreadInvites, setUnreadNotifications]);

  const tabBadges = useMemo(
    () => ({
      notifications: unreadNotifications,
      chats: unreadChats,
      invites: unreadInvites
    }),
    [unreadChats, unreadInvites, unreadNotifications]
  );

  const handleTabChange = (tab: CommunicationTab) => {
    if (tab !== activeTab) {
      openDrawer(tab);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(next) => (!next ? closeDrawer() : undefined)}>
      <SheetContent
        side="right"
        className="flex h-full flex-col overflow-hidden p-0 shadow-2xl sm:max-w-[440px] md:max-w-[500px] lg:max-w-[560px]"
      >
        <header className="flex items-center gap-3 border-b border-[color:var(--surface-border-subtle)] px-6 py-4">
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            aria-label="Закрыть панель"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <nav className="flex flex-1 items-center justify-center">
            <div className="inline-flex rounded-full bg-[color:var(--surface-muted)] p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                const badge = tabBadges[tab.id];
                const showBadge = !isActive && typeof badge === 'number' && badge > 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                      isActive
                        ? 'bg-indigo-500 text-white shadow'
                        : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                    {showBadge ? (
                      <span className="absolute -top-1 -right-1 rounded-full bg-indigo-500/20 px-1.5 py-[2px] text-xs font-semibold text-indigo-200">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="hidden w-9 sm:block" aria-hidden="true" />
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === 'notifications' ? (
            <NotificationsPanel onMarkAllRead={() => setUnreadNotifications(0)} />
          ) : activeTab === 'chats' ? (
            <ChatPanel
              onSelectChat={() => {
                setUnreadChats(0);
                closeDrawer();
              }}
            />
          ) : (
            <InvitesPanel />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
