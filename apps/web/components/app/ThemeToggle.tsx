'use client';

import clsx from 'clsx';
import { useTheme } from '@/components/theme/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, toggleMode } = useTheme();

  const label = resolvedTheme === 'light' ? 'Светлая тема' : 'Тёмная тема';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={clsx(
        'group flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'border-[color:var(--theme-control-border)] bg-[color:var(--theme-control-bg)] text-[color:var(--theme-control-foreground)]',
        'hover:border-[color:var(--theme-control-border-hover)] hover:text-[color:var(--theme-control-foreground-hover)]'
      )}
      aria-label={`${label}. Нажмите, чтобы переключить`}
      title={`${label} · Кликните для смены режима`}
    >
      {resolvedTheme === 'light' ? (
        <Sun
          aria-hidden="true"
          className="h-[18px] w-[18px] transition group-hover:scale-105"
          strokeWidth={1.5}
        />
      ) : (
        <Moon
          aria-hidden="true"
          className="h-[18px] w-[18px] transition group-hover:scale-105"
          strokeWidth={1.5}
        />
      )}
    </button>
  );
}
