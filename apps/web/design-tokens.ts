export type ThemeName = 'dark' | 'light';

type TokenRecord = Record<string, string>;

type DesignTokens = {
  shared: TokenRecord;
  themes: Record<ThemeName, TokenRecord>;
};

export const designTokens: DesignTokens = {
  shared: {
    'content-inline-padding': '20px',
    'rail-collapsed-width': '56px',
    'rail-dock-spacing': '1rem',
    'rail-safe-gap': '5px',
    'rail-safe-area': 'calc(var(--rail-collapsed-width) + var(--rail-dock-spacing) + var(--rail-safe-gap))',
    
    // Единые стили для блоков контента (эталонный блок)
    'content-block-radius': '1.5rem',        // 24px - rounded-3xl
    'content-block-radius-sm': '1rem',       // 16px - rounded-2xl (для вложенных элементов)
    'content-block-padding': '1.5rem',       // 24px - p-6
    'content-block-padding-sm': '1rem',      // 16px - p-4 (для вложенных элементов)
    'content-block-gap': '1.5rem',           // 24px - space-y-6, gap-6
    'content-block-gap-sm': '1rem',          // 16px - gap-4 (для меньших отступов)
    'content-block-border-width': '1px',
    'content-block-shadow': '0_0_12px_rgba(0,0,0,0.12)',
    
    // Градиентная подсветка для блоков маркетинга - используется классом .marketing-glow
    // Создает внешнее свечение с градиентом индиго/фиолетового цвета
    'glow-shadow': '0_0_30px_rgba(0,0,0,0.25), 0_0_60px_rgba(99,102,241,0.1), 0_0_90px_rgba(99,102,241,0.05)',
    
    // ============================================
    // УНИФИЦИРОВАННАЯ СИСТЕМА ТИПОГРАФИКИ
    // Минимальный набор размеров для всей платформы
    // ============================================
    
    // Основные размеры для контента (используются везде)
    'font-size-xs': '12px',                  // 0.75rem - метки, подписи, вторичная информация
    'font-size-sm': '14px',                  // 0.875rem - основной текст в блоках, кнопки, формы
    'font-size-base': '16px',                // 1rem - базовый размер (body) - стандартный веб-размер для доступности
    'font-size-lg': '18px',                  // 1.125rem - заголовки блоков контента
    'font-size-xl': '24px',                  // 1.5rem - заголовки разделов, важные значения
    
    // Дополнительные размеры для маркетинга и hero секций (используются редко)
    'font-size-2xl': '30px',                 // 1.875rem - большие заголовки (маркетинг)
    'font-size-3xl': '36px',                 // 2.25rem - очень большие заголовки (hero)
    
    // Line heights для типографики
    'line-height-tight': '1.2',              // Для заголовков
    'line-height-normal': '1.5',             // Для обычного текста
    'line-height-relaxed': '1.7'             // Для параграфов
  },
  themes: {
    dark: {
      'surface-canvas': '#0d0d0d',
      'surface-base': 'rgba(20, 20, 20, 0.95)',
      'surface-muted': 'rgba(26, 26, 26, 0.9)',
      'surface-popover': 'rgba(20, 20, 20, 0.98)',
      'surface-overlay': 'rgba(0, 0, 0, 0.7)',
      'surface-border-subtle': 'rgba(255, 255, 255, 0.1)',
      'surface-border-strong': 'rgba(255, 255, 255, 0.2)',
      'surface-chip': '#1a1a1a',
      'text-primary': '#ffffff',
      'text-secondary': '#e5e5e5',
      'text-tertiary': '#a0a0a0',
      'text-chip': '#e5e5e5',
      'accent-border': 'rgba(255, 255, 255, 0.2)',
      'accent-border-strong': 'rgba(255, 255, 255, 0.3)',
      'accent-bg': 'rgba(255, 255, 255, 0.08)',
      'accent-bg-strong': 'rgba(255, 255, 255, 0.12)',
      'accent-foreground': '#ffffff',
      'button-primary-bg': '#ffffff',
      'button-primary-bg-hover': '#e5e5e5',
      'button-primary-bg-active': '#cccccc',
      'button-primary-border': '#ffffff',
      'button-primary-border-strong': '#e5e5e5',
      'button-primary-foreground': '#0d0d0d',
      'button-danger-bg': '#ef4444',
      'button-danger-bg-hover': '#dc2626',
      'button-danger-bg-active': '#b91c1c',
      'button-danger-border': '#f87171',
      'button-danger-border-strong': '#b91c1c',
      'button-danger-foreground': '#ffffff',
      'button-ghost-foreground': '#e5e5e5',
      'button-trendy-bg': '#2a2a2a',
      'button-trendy-bg-hover': '#333333',
      'button-trendy-bg-active': '#3a3a3a',
      'button-trendy-border': 'rgba(255, 255, 255, 0.2)',
      'button-trendy-border-strong': 'rgba(255, 255, 255, 0.3)',
      'button-trendy-foreground': '#ffffff',
      'theme-control-bg': 'rgba(26, 26, 26, 0.8)',
      'theme-control-border': 'rgba(255, 255, 255, 0.15)',
      'theme-control-border-hover': 'rgba(255, 255, 255, 0.25)',
      'theme-control-foreground': '#e5e5e5',
      'theme-control-foreground-hover': '#ffffff',
      
      // Токены для блоков контента (темная тема)
      'content-block-bg': 'rgba(13, 13, 13, 0.7)',           // bg-neutral-950/70
      'content-block-bg-hover': 'rgba(13, 13, 13, 0.8)',     // для hover состояний
      'content-block-bg-sm': 'rgba(10, 10, 10, 0.6)',        // bg-neutral-950/60 (для вложенных)
      'content-block-border': 'rgba(17, 24, 39, 1)',         // border-neutral-900
      'content-block-border-sm': 'rgba(31, 41, 55, 0.7)',    // border-neutral-800/70 (для вложенных)
      'content-block-border-hover': 'rgba(99, 102, 241, 0.3)' // для интерактивных блоков
    },
    light: {
      'surface-canvas': '#f4f6fb',
      'surface-base': 'rgba(255, 255, 255, 0.96)',
      'surface-muted': 'rgba(241, 245, 249, 0.92)',
      'surface-popover': 'rgba(255, 255, 255, 0.98)',
      'surface-overlay': 'rgba(15, 23, 42, 0.45)',
      'surface-border-subtle': 'rgba(148, 163, 184, 0.35)',
      'surface-border-strong': 'rgba(100, 116, 139, 0.45)',
      'surface-chip': 'rgba(15, 23, 42, 0.08)',
      'text-primary': '#0f172a',
      'text-secondary': '#1f2937',
      'text-tertiary': '#334155',
      'text-chip': '#0f172a',
      'accent-border': 'rgba(79, 70, 229, 0.55)',
      'accent-border-strong': 'rgba(67, 56, 202, 0.75)',
      'accent-bg': 'rgba(99, 102, 241, 0.16)',
      'accent-bg-strong': 'rgba(79, 70, 229, 0.18)',
      'accent-foreground': '#ffffff',
      'button-primary-bg': '#6366f1',
      'button-primary-bg-hover': '#4f46e5',
      'button-primary-bg-active': '#4338ca',
      'button-primary-border': '#6366f1',
      'button-primary-border-strong': '#4f46e5',
      'button-primary-foreground': '#ffffff',
      'button-danger-bg': '#ef4444',
      'button-danger-bg-hover': '#dc2626',
      'button-danger-bg-active': '#b91c1c',
      'button-danger-border': '#fca5a5',
      'button-danger-border-strong': '#dc2626',
      'button-danger-foreground': '#ffffff',
      'button-ghost-foreground': '#6366f1',
      'button-trendy-bg': '#474973',
      'button-trendy-bg-hover': '#3b3d61',
      'button-trendy-bg-active': '#2f304f',
      'button-trendy-border': '#6c6da4',
      'button-trendy-border-strong': '#9a9ccd',
      'button-trendy-foreground': '#ffffff',
      'theme-control-bg': 'rgba(148, 163, 184, 0.18)',
      'theme-control-border': 'rgba(148, 163, 184, 0.38)',
      'theme-control-border-hover': 'rgba(79, 70, 229, 0.6)',
      'theme-control-foreground': '#1e293b',
      'theme-control-foreground-hover': '#312e81',
      
      // Токены для блоков контента (светлая тема)
      'content-block-bg': 'rgba(255, 255, 255, 0.94)',       // белый с прозрачностью
      'content-block-bg-hover': 'rgba(255, 255, 255, 0.98)', // для hover состояний
      'content-block-bg-sm': 'rgba(241, 245, 249, 0.9)',     // для вложенных
      'content-block-border': 'rgba(148, 163, 184, 0.45)',   // border-neutral-900 эквивалент
      'content-block-border-sm': 'rgba(148, 163, 184, 0.35)', // для вложенных
      'content-block-border-hover': 'rgba(99, 102, 241, 0.4)' // для интерактивных блоков
    }
  }
};

export const DEFAULT_THEME: ThemeName = 'dark';

export function getResolvedTokens(theme: ThemeName): TokenRecord {
  return { ...designTokens.shared, ...designTokens.themes[theme] };
}

export function applyThemeTokens(theme: ThemeName) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const tokens = getResolvedTokens(theme);
  const style = root.style;
  
  // Временно отключаем transition для body и html чтобы избежать дерганий
  const body = document.body;
  const originalBodyTransition = body.style.transition;
  const originalHtmlTransition = root.style.transition;
  body.style.transition = 'none';
  root.style.transition = 'none';
  
  // Сначала обновляем data-theme (это может вызвать пересчет CSS селекторов)
  // Но делаем это до обновления переменных, чтобы браузер мог оптимизировать
  root.dataset.theme = theme;
  
  // Затем применяем все CSS переменные синхронно
  // Используем прямой доступ к style для лучшей производительности
  for (const [token, value] of Object.entries(tokens)) {
    style.setProperty(`--${token}`, value);
  }
  
  // Обновляем colorScheme в конце
  style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  
  // Восстанавливаем transition после следующего кадра
  // Используем двойной RAF чтобы убедиться что все обновления применены
  // Затем используем requestIdleCallback для восстановления transition без блокировки
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const restoreTransition = () => {
        body.style.transition = originalBodyTransition || '';
        root.style.transition = originalHtmlTransition || '';
      };
      
      // Используем requestIdleCallback если доступен для неблокирующего восстановления
      if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(restoreTransition, { timeout: 100 });
      } else {
        restoreTransition();
      }
    });
  });
}

export function getCssVarReference(token: string) {
  return `var(--${token})`;
}

export function getTailwindColorTokens(): Record<string, string> {
  const themeTokens = designTokens.themes.dark;
  return Object.fromEntries(Object.keys(themeTokens).map((token) => [token, getCssVarReference(token)]));
}

export function getTailwindSpacingTokens(): Record<string, string> {
  const spacingTokens: Record<string, string> = {
    'content-inline': getCssVarReference('content-inline-padding'),
    'rail-collapsed': getCssVarReference('rail-collapsed-width'),
    'rail-dock-spacing': getCssVarReference('rail-dock-spacing'),
    'rail-safe-gap': getCssVarReference('rail-safe-gap'),
    'rail-safe-area': getCssVarReference('rail-safe-area'),
    'content-block': getCssVarReference('content-block-padding'),
    'content-block-sm': getCssVarReference('content-block-padding-sm'),
    'content-block-gap': getCssVarReference('content-block-gap'),
    'content-block-gap-sm': getCssVarReference('content-block-gap-sm')
  };
  return spacingTokens;
}

export function getTailwindContentBlockTokens(): Record<string, string> {
  return {
    'content-block-radius': getCssVarReference('content-block-radius'),
    'content-block-radius-sm': getCssVarReference('content-block-radius-sm')
  };
}

/**
 * Возвращает токены типографики для Tailwind конфигурации
 * Используются для создания кастомных размеров шрифтов
 */
export function getTailwindTypographyTokens(): Record<string, string> {
  return {
    'xs': getCssVarReference('font-size-xs'),
    'sm': getCssVarReference('font-size-sm'),
    'base': getCssVarReference('font-size-base'),
    'lg': getCssVarReference('font-size-lg'),
    'xl': getCssVarReference('font-size-xl'),
    '2xl': getCssVarReference('font-size-2xl'),
    '3xl': getCssVarReference('font-size-3xl')
  };
}
