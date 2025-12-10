'use client';

import { create } from 'zustand';

type ChatsModalState = {
  isOpen: boolean;
  activeThreadId: string | null;
  open: (threadId?: string | null) => void;
  close: () => void;
  setActiveThread: (threadId: string | null) => void;
};

export const useChatsModal = create<ChatsModalState>((set) => ({
  isOpen: false,
  activeThreadId: null,
  open: (threadId = null) => set({ isOpen: true, activeThreadId: threadId }),
  close: () => set({ isOpen: false }),
  setActiveThread: (threadId) => set({ activeThreadId: threadId })
}));
