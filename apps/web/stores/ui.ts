import { create } from 'zustand';

export type Drawer = null | 'document' | 'assistant' | 'rail-settings';
export type Dialog = null | 'invite';

type UIState = {
  railExpanded: boolean;
  setRailExpanded: (value: boolean) => void;

  drawer: Drawer;
  openDrawer: (drawer: Drawer) => void;
  closeDrawer: () => void;

  dialog: Dialog;
  openDialog: (dialog: Dialog) => void;
  closeDialog: () => void;

  unreadChats: number;
  unreadNotifications: number;
  unreadInvites: number;
  setUnreadChats: (value: number) => void;
  setUnreadNotifications: (value: number) => void;
  setUnreadInvites: (value: number) => void;
};

export const useUI = create<UIState>((set) => ({
  railExpanded: false,
  setRailExpanded: (value) => set({ railExpanded: value }),

  drawer: null,
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null }),

  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),

  unreadChats: 0,
  unreadNotifications: 0,
  unreadInvites: 0,
  setUnreadChats: (value) => set({ unreadChats: value }),
  setUnreadNotifications: (value) => set({ unreadNotifications: value }),
  setUnreadInvites: (value) => set({ unreadInvites: value })
}));
