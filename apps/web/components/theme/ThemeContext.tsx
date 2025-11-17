'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_THEME, applyThemeTokens, type ThemeName } from '@/design-tokens';

type ThemeMode = 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'cv-theme-mode';

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    // Игнорируем ошибки при чтении из localStorage
  }
  return DEFAULT_THEME;
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Инициализируем mode одинаково на сервере и клиенте для предотвращения hydration errors
  // На клиенте обновим после монтирования
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_THEME);
  
  // Инициализируем resolvedTheme одинаково на сервере и клиенте для предотвращения hydration errors
  // На клиенте обновим после монтирования
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(DEFAULT_THEME);

  // Флаг для отслеживания первой инициализации
  const [isInitialized, setIsInitialized] = useState(false);

  // Синхронизируемся с темой, которая уже применена ThemeScript при первой загрузке
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) {
      return;
    }

    setIsInitialized(true);
    
    // Проверяем текущую применённую тему из DOM
    const appliedTheme = document.documentElement.dataset.theme as ThemeName | undefined;
    if (appliedTheme === 'light' || appliedTheme === 'dark') {
      // Синхронизируем resolvedTheme с уже применённой темой
      setResolvedTheme(appliedTheme);
      setMode(appliedTheme);
    } else {
      // Если тема не применена, применяем сохранённую
      const stored = getStoredMode();
      setResolvedTheme(stored);
      applyThemeTokens(stored);
    }
  }, [isInitialized]);

  // Применяем тему только при изменении mode после инициализации
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) {
      return;
    }

    const nextTheme: ResolvedTheme = mode;
    
    // Применяем тему только если она отличается от текущей
    const currentApplied = document.documentElement.dataset.theme as ThemeName | undefined;
    if (currentApplied !== nextTheme) {
      // Используем flushSync для синхронного обновления React состояния и DOM
      // Это предотвращает рассинхронизацию и дергания
      flushSync(() => {
        setResolvedTheme(nextTheme);
      });
      
      // Применяем токены синхронно сразу после обновления состояния
      applyThemeTokens(nextTheme);
    }

    // Сохраняем в localStorage асинхронно для избежания блокировки
    // Используем requestIdleCallback если доступен, иначе setTimeout
    const saveToStorage = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch (error) {
        console.error('Failed to save theme to storage', error);
      }
    };

    if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(saveToStorage, { timeout: 1000 });
    } else {
      setTimeout(saveToStorage, 0);
    }
  }, [mode, isInitialized]);

  const setModeSafe = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode: setModeSafe, toggleMode }),
    [mode, resolvedTheme, toggleMode, setModeSafe]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
