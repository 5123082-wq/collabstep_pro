'use client';

import { Suspense, lazy } from 'react';
import { useUI } from '@/stores/ui';

const CommunicationDrawer = lazy(() => import('./CommunicationDrawer'));
const DocumentDrawer = lazy(() => import('./DocumentDrawer'));
const AssistantDrawer = lazy(() => import('./AssistantDrawer'));
const RailSettingsDrawer = lazy(() => import('./RailSettingsDrawer'));

export function DrawerManager() {
  const drawer = useUI((state) => state.drawer);
  const isCommunicationDrawer = drawer === 'chats' || drawer === 'notifications';

  return (
    <Suspense fallback={null}>
      {isCommunicationDrawer ? <CommunicationDrawer /> : null}
      {drawer === 'document' ? <DocumentDrawer /> : null}
      {drawer === 'assistant' ? <AssistantDrawer /> : null}
      {drawer === 'rail-settings' ? <RailSettingsDrawer /> : null}
    </Suspense>
  );
}
