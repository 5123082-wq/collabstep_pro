'use client';

import { create } from 'zustand';
import type { MarketplaceInquiry, MarketplaceTemplate } from './types';

export const MARKETPLACE_PERSONAL_STATE_ENABLED = false;

export type CartItem = {
  templateId: string;
  quantity: number;
};

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

export const useMarketplaceStore = create<MarketplaceState>()((set) => ({
  favorites: [],
  cart: [],
  inquiries: [],
  resetFiltersSignal: 0,
  selectedTemplateId: null,
  addToCart: (_templateId) => {
    void _templateId;
  },
  removeFromCart: (_templateId) => {
    void _templateId;
  },
  updateQuantity: (_templateId, _quantity) => {
    void _templateId;
    void _quantity;
  },
  toggleFavorite: (_templateId) => {
    void _templateId;
  },
  clearCart: () => undefined,
  submitInquiry: (_input) => {
    void _input;
  },
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
