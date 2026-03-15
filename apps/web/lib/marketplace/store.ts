'use client';

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { MarketplaceInquiry, MarketplaceTemplate } from './types';

export type CartItem = {
  templateId: string;
  quantity: number;
};

const memoryStore: Record<string, string> = {};

const memoryStorage: StateStorage = {
  getItem: (name) => (name in memoryStore ? memoryStore[name]! : null),
  setItem: (name, value) => {
    memoryStore[name] = value;
  },
  removeItem: (name) => {
    delete memoryStore[name];
  }
};

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as { templateId?: unknown }).templateId !== 'string' ||
      typeof (item as { quantity?: unknown }).quantity !== 'number'
    ) {
      return [];
    }

    return [
      {
        templateId: (item as { templateId: string }).templateId,
        quantity: Math.max(1, Math.trunc((item as { quantity: number }).quantity))
      }
    ];
  });
}

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function sanitizeInquiries(value: unknown): MarketplaceInquiry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as { id?: unknown }).id !== 'string' ||
      typeof (item as { sourceKind?: unknown }).sourceKind !== 'string' ||
      typeof (item as { sourceId?: unknown }).sourceId !== 'string' ||
      typeof (item as { sourceTitle?: unknown }).sourceTitle !== 'string' ||
      typeof (item as { brief?: unknown }).brief !== 'string' ||
      typeof (item as { desiredOutcome?: unknown }).desiredOutcome !== 'string' ||
      typeof (item as { createdAt?: unknown }).createdAt !== 'string'
    ) {
      return [];
    }

    const next: MarketplaceInquiry = {
      id: (item as { id: string }).id,
      sourceKind: (item as { sourceKind: MarketplaceInquiry['sourceKind'] }).sourceKind,
      sourceId: (item as { sourceId: string }).sourceId,
      sourceTitle: (item as { sourceTitle: string }).sourceTitle,
      brief: (item as { brief: string }).brief,
      desiredOutcome: (item as { desiredOutcome: string }).desiredOutcome,
      createdAt: (item as { createdAt: string }).createdAt
    };

    const linkedProjectId = (item as { linkedProjectId?: unknown }).linkedProjectId;
    const linkedProjectTitle = (item as { linkedProjectTitle?: unknown }).linkedProjectTitle;
    if (typeof linkedProjectId === 'string' && linkedProjectId.trim().length > 0) {
      next.linkedProjectId = linkedProjectId;
    }
    if (typeof linkedProjectTitle === 'string' && linkedProjectTitle.trim().length > 0) {
      next.linkedProjectTitle = linkedProjectTitle;
    }

    return [next];
  });
}

export type MarketplaceState = {
  favorites: string[];
  cart: CartItem[];
  inquiries: MarketplaceInquiry[];
  selectedTemplateId: string | null;
  addToCart: (templateId: string) => void;
  removeFromCart: (templateId: string) => void;
  updateQuantity: (templateId: string, quantity: number) => void;
  toggleFavorite: (templateId: string) => void;
  clearCart: () => void;
  submitInquiry: (input: Omit<MarketplaceInquiry, 'id' | 'createdAt'>) => void;
  resetFiltersSignal: number;
  triggerResetFilters: () => void;
  openTemplateDetail: (templateId: string) => void;
  closeTemplateDetail: () => void;
};

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set) => ({
      favorites: [],
      cart: [],
      inquiries: [],
      resetFiltersSignal: 0,
      selectedTemplateId: null,
      addToCart: (templateId) =>
        set((state) => {
          const existing = state.cart.find((item) => item.templateId === templateId);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.templateId === templateId ? { ...item, quantity: item.quantity + 1 } : item
              )
            };
          }
          return { cart: [...state.cart, { templateId, quantity: 1 }] };
        }),
      removeFromCart: (templateId) =>
        set((state) => ({ cart: state.cart.filter((item) => item.templateId !== templateId) })),
      updateQuantity: (templateId, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.templateId === templateId ? { ...item, quantity: Math.max(quantity, 1) } : item
          )
        })),
      toggleFavorite: (templateId) =>
        set((state) =>
          state.favorites.includes(templateId)
            ? { favorites: state.favorites.filter((id) => id !== templateId) }
            : { favorites: [...state.favorites, templateId] }
        ),
      clearCart: () => set({ cart: [] }),
      submitInquiry: (input) =>
        set((state) => ({
          inquiries: [
            {
              id: crypto.randomUUID(),
              ...input,
              createdAt: new Date().toISOString()
            },
            ...state.inquiries
          ]
        })),
      triggerResetFilters: () => set((state) => ({ resetFiltersSignal: state.resetFiltersSignal + 1 })),
      openTemplateDetail: (templateId) => set({ selectedTemplateId: templateId }),
      closeTemplateDetail: () => set({ selectedTemplateId: null })
    }),
    {
      name: 'cv-marketplace-store',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? memoryStorage : (window.localStorage as unknown as StateStorage)
      ),
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
        inquiries: state.inquiries
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<MarketplaceState>) ?? {};
        return {
          ...currentState,
          ...persisted,
          favorites: sanitizeStringList(persisted.favorites),
          cart: sanitizeCartItems(persisted.cart),
          inquiries: sanitizeInquiries(persisted.inquiries)
        } satisfies MarketplaceState;
      }
    }
  )
);

export function enrichCartItems(cart: CartItem[], templates: MarketplaceTemplate[]) {
  return cart
    .map((item) => {
      const template = templates.find((template) => template.id === item.templateId);
      if (!template) {
        return undefined;
      }
      return { ...item, template };
    })
    .filter(Boolean) as Array<CartItem & { template: MarketplaceTemplate }>;
}
