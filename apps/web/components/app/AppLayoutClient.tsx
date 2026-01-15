'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { AppShellProvider } from '@/components/app/AppShellContext';
import { SessionProvider } from '@/components/app/SessionContext';
import { OrganizationProvider } from '@/components/organizations/OrganizationContext';
import AppTopbar from '@/components/app/AppTopbar';
import CommandPalette from '@/components/app/CommandPalette';
import ContentContainer from '@/components/app/ContentContainer';
import CreateMenu from '@/components/app/CreateMenu';
import Sidebar from '@/components/app/Sidebar';
import ToastHub from '@/components/app/ToastHub';
import HoverRail from '@/components/right-rail/HoverRail';
import PlatformSettingsModal from '@/components/settings/PlatformSettingsModal';
import UserProfileSettingsModal from '@/components/settings/UserProfileSettingsModal';
import CreateTaskWithProjectModal from '@/components/pm/CreateTaskWithProjectModal';
import CreateProjectModal from '@/components/pm/CreateProjectModal';
import CreateProjectFromTemplateModal from '@/components/projects/CreateProjectFromTemplateModal';
import { CreateAIAgentModal } from '@/components/ai-hub';
import { AIAssistantChat, AIAssistantButton } from '@/components/ai-assistant';
import { CreateVacancyModal } from '@/components/performers/CreateVacancyModal';
import { flags } from '@/lib/flags';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { DemoSession } from '@/lib/auth/demo-session';
import { getRolesForDemoAccount, setUserRoles } from '@/lib/auth/roles';
import { toast } from '@/lib/ui/toast';
import { useQueryToast } from '@/lib/ui/useQueryToast';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useUnreadInvites } from '@/hooks/useUnreadInvites';

const TOAST_MESSAGES: Record<string, { message: string; tone?: 'info' | 'success' | 'warning' }> = {
  'register-success': { message: 'Регистрация успешна', tone: 'success' },
  forbidden: { message: 'Недостаточно прав', tone: 'warning' }
};

type AppLayoutClientProps = {
  session: DemoSession;
  children: ReactNode;
};

const AVATAR_STORAGE_KEY = 'cv-user-avatar';

function getStoredAvatar(email: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(`${AVATAR_STORAGE_KEY}-${email}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function AppLayoutClient({ session, children }: AppLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isProfileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Инициализируем как null, чтобы избежать проблем с гидратацией
  // Загружаем avatar только после монтирования компонента
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const roles = useMemo(() => getRolesForDemoAccount(session.email, session.role), [session.email, session.role]);
  const isAIAssistantEnabled = useFeatureFlag('FEATURE_AI_ASSISTANT');
  useQueryToast(TOAST_MESSAGES);
  useUnreadNotifications(session.userId);
  useUnreadInvites(session.userId);

  // Устанавливаем mounted после монтирования для избежания проблем с гидратацией
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Загружаем avatar только после монтирования, чтобы избежать проблем с гидратацией
  useEffect(() => {
    const stored = getStoredAvatar(session.email);
    if (stored) {
      setAvatarUrl(stored);
    }
  }, [session.email]);

  const handleAvatarChange = useCallback((newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
  }, []);

  const openCreateMenu = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const openCommandPalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const openProfileSettings = useCallback(() => {
    setProfileSettingsOpen(true);
  }, []);

  useEffect(() => {
    setUserRoles(roles);
  }, [roles]);

  // Обработка событий открытия модальных окон
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ component: string }>;
      const component = customEvent.detail.component;
      console.log('[AppLayoutClient] Opening modal:', component);
      if (component === 'createVacancy' && !(pathname?.startsWith('/performers') ?? false)) {
        setCreateOpen(false);
        return;
      }
      setActiveModal(component);
      setCreateOpen(false); // Закрываем dropdown меню
    };

    window.addEventListener('open-create-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-create-modal', handleOpenModal);
    };
  }, [pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
      if (event.key === 'Escape') {
        // Закрываем модальные окна в первую очередь
        if (activeModal) {
          event.preventDefault();
          setActiveModal(null);
          return;
        }
        // Затем закрываем меню
        setCreateOpen(false);
        setPaletteOpen(false);
        setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeModal]);

  const railFlagValue =
    process.env.NEXT_PUBLIC_VITE_FEATURE_RAIL ?? process.env.VITE_FEATURE_RAIL ?? '1';
  const isHoverRailEnabled = ['1', 'true', 'on', 'enabled'].includes(railFlagValue.toLowerCase());

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      });

      if (response.ok) {
        const data = (await response.json().catch(() => null)) as { redirect?: string } | null;
        if (data?.redirect) {
          router.push(data.redirect);
          return;
        }
      }

      if (response.redirected) {
        router.push(response.url);
        return;
      }

      router.push('/login');
    } catch (error) {
      toast('Не удалось выйти. Повторите попытку.', 'warning');
    } finally {
      setLoggingOut(false);
    }
  };

  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <SessionProvider session={session}>
      <OrganizationProvider>
        <AppShellProvider openCreateMenu={openCreateMenu} openCommandPalette={openCommandPalette}>
          <div
          className={clsx(
            'flex h-screen min-h-0 max-h-screen overflow-hidden bg-transparent text-[color:var(--text-primary)]',
            isAdminRoute && 'admin-route'
          )}
        >
          <Sidebar roles={roles} />
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
            <AppTopbar
              profile={{ email: session.email, role: session.role, ...(avatarUrl && { avatarUrl }) }}
              onOpenCreate={openCreateMenu}
              onOpenPalette={openCommandPalette}
              onOpenSettings={openSettings}
              onOpenProfileSettings={openProfileSettings}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              createButtonRef={createButtonRef}
              onAvatarChange={handleAvatarChange}
            />
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[color:var(--surface-base)]">
              <ContentContainer>
                {children}
              </ContentContainer>
            </div>
          </div>
          <CreateMenu open={isCreateOpen} onClose={() => setCreateOpen(false)} triggerRef={createButtonRef} />
          <CommandPalette open={isPaletteOpen} onClose={() => setPaletteOpen(false)} />
          <PlatformSettingsModal open={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
          <UserProfileSettingsModal 
            open={isProfileSettingsOpen} 
            onClose={() => setProfileSettingsOpen(false)}
            onSaved={() => {
              // Обновляем страницу после сохранения профиля
              router.refresh();
            }}
          />
          {activeModal === 'createTask' && (
            <CreateTaskWithProjectModal
              isOpen={activeModal === 'createTask'}
              onClose={() => setActiveModal(null)}
            />
          )}
          {activeModal === 'createAIAgent' && (
            <CreateAIAgentModal
              open={activeModal === 'createAIAgent'}
              onClose={() => setActiveModal(null)}
              onSuccess={() => {
                toast('AI Agent created', 'success');
              }}
            />
          )}
          {activeModal === 'createProject' && (
            <CreateProjectModal
              isOpen={activeModal === 'createProject'}
              onClose={() => setActiveModal(null)}
            />
          )}
          {activeModal === 'createProjectFromTemplate' && (
            <CreateProjectFromTemplateModal
              isOpen={activeModal === 'createProjectFromTemplate'}
              onClose={() => setActiveModal(null)}
            />
          )}
          {activeModal === 'createVacancy' && (
            <CreateVacancyModal
              open={activeModal === 'createVacancy'}
              onClose={() => setActiveModal(null)}
            />
          )}
          <ToastHub />
          {isHoverRailEnabled ? <HoverRail permissions={roles} /> : null}
          {/* AI Assistant - рендерим только после монтирования для избежания проблем с гидратацией */}
          {isMounted && (flags.AI_ASSISTANT || isAIAssistantEnabled) && (
            <div className="fixed bottom-6 right-6 z-50">
              <AIAssistantButton onClick={() => setAssistantOpen(true)} />
            </div>
          )}
          {isMounted && (flags.AI_ASSISTANT || isAIAssistantEnabled) && (
            <AIAssistantChat
              open={isAssistantOpen}
              onClose={() => setAssistantOpen(false)}
            />
          )}
          </div>
        </AppShellProvider>
      </OrganizationProvider>
    </SessionProvider>
  );
}
