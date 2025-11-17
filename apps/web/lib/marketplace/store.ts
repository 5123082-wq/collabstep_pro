'use client';

import { create } from 'zustand';
import type { MarketplaceTemplate } from './types';

export type CartItem = {
  templateId: string;
  quantity: number;
};

export type MarketplaceState = {
  favorites: string[];
  cart: CartItem[];
  selectedTemplateId: string | null;
  addToCart: (templateId: string) => void;
  removeFromCart: (templateId: string) => void;
  updateQuantity: (templateId: string, quantity: number) => void;
  toggleFavorite: (templateId: string) => void;
  clearCart: () => void;
  resetFiltersSignal: number;
  triggerResetFilters: () => void;
  openTemplateDetail: (templateId: string) => void;
  closeTemplateDetail: () => void;
};

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  favorites: [],
  cart: [],
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
  triggerResetFilters: () => set((state) => ({ resetFiltersSignal: state.resetFiltersSignal + 1 })),
  openTemplateDetail: (templateId) => set({ selectedTemplateId: templateId }),
  closeTemplateDetail: () => set({ selectedTemplateId: null })
}));

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
