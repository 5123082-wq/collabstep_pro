'use client';

import { createContext, useContext } from 'react';
import type { DemoSession } from '@/lib/auth/demo-session';

type SessionContextValue = {
  session: DemoSession;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  session,
  children
}: {
  session: DemoSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={{ session }}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): DemoSession {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context.session;
}

