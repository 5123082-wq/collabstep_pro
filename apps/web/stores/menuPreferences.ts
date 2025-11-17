import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { leftMenuConfig } from '@/components/app/LeftMenu.config';
import type { UserType } from '@/lib/auth/roles';

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

// Все доступные ID секций меню
export const ALL_MENU_IDS = leftMenuConfig.map((section) => section.id);

// Предустановки для разных типов пользователей
export const MENU_PRESETS: {
  performer: string[];
  marketer: string[];
  null: string[];
} = {
  performer: [
    'dashboard',
    'projects',
    'marketplace',
    'performers',
    'ai-hub',
    'community',
    'docs',
    'support'
  ],
  marketer: [
    'dashboard',
    'projects',
    'marketing',
    'ai-hub',
    'community',
    'docs',
    'support'
  ],
  null: ALL_MENU_IDS // Полное меню по умолчанию
};

type MenuPreferencesState = {
  visibleMenuIds: string[];
  setVisibleMenuIds: (ids: string[]) => void;
  toggleMenuVisibility: (id: string) => void;
  applyPreset: (userType: UserType) => void;
  reset: () => void;
  isMenuVisible: (id: string) => boolean;
};

function sanitizeMenuIds(ids: unknown, fallbackIds: string[]): string[] {
  if (!Array.isArray(ids)) {
    return [...fallbackIds];
  }
  const availableSet = new Set(ALL_MENU_IDS);
  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const candidate of ids) {
    if (typeof candidate !== 'string') {
      continue;
    }
    if (!availableSet.has(candidate)) {
      continue;
    }
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    sanitized.push(candidate);
  }
  // Убеждаемся, что есть хотя бы одна видимая секция
  if (sanitized.length === 0) {
    return ['dashboard'];
  }
  return sanitized;
}

export const useMenuPreferencesStore = create<MenuPreferencesState>()(
  persist(
    (set, get) => ({
      visibleMenuIds: ALL_MENU_IDS,
      setVisibleMenuIds: (ids) => {
        set({ visibleMenuIds: sanitizeMenuIds(ids, ALL_MENU_IDS) });
      },
      toggleMenuVisibility: (id) => {
        set((state) => {
          const isVisible = state.visibleMenuIds.includes(id);
          if (isVisible) {
            // Не позволяем скрыть все пункты меню
            if (state.visibleMenuIds.length <= 1) {
              return state;
            }
            return {
              visibleMenuIds: state.visibleMenuIds.filter((item) => item !== id)
            };
          }
          // Добавляем только если ID валидный
          if (ALL_MENU_IDS.includes(id)) {
            return {
              visibleMenuIds: [...state.visibleMenuIds, id]
            };
          }
          return state;
        });
      },
      applyPreset: (userType) => {
        const key = userType ?? 'null';
        const preset = MENU_PRESETS[key as keyof typeof MENU_PRESETS];
        set({ visibleMenuIds: [...preset] });
      },
      reset: () => {
        set({ visibleMenuIds: [...ALL_MENU_IDS] });
      },
      isMenuVisible: (id) => {
        return get().visibleMenuIds.includes(id);
      }
    }),
    {
      name: 'cv-menu-preferences',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? memoryStorage : (window.localStorage as unknown as StateStorage)
      ),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<MenuPreferencesState>) ?? {};
        const visibleMenuIds = sanitizeMenuIds(persisted.visibleMenuIds, ALL_MENU_IDS);
        return {
          ...currentState,
          ...persisted,
          visibleMenuIds
        } satisfies MenuPreferencesState;
      }
    }
  )
);

