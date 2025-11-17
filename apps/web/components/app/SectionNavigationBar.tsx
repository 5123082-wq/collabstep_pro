'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

type SectionNavigationBarProps = {
  items: readonly NavigationItem[];
  ariaLabel: string;
  basePath?: string;
  exactMatch?: boolean; // Если true, использует точное совпадение для всех вкладок (как в маркетинге)
};

/**
 * Универсальный компонент панели навигации для разделов платформы.
 * Централизованное управление стилями - изменения автоматически применяются ко всем разделам.
 */
export default function SectionNavigationBar({ 
  items, 
  ariaLabel,
  basePath,
  exactMatch = false
}: SectionNavigationBarProps) {
  const pathname = usePathname();

  return (
    <div className="border-t border-neutral-900/60 px-[21.6px] py-[7.2px]">
      <nav 
        className="flex items-center gap-[5.4px] overflow-x-auto scrollbar-hide"
        aria-label={ariaLabel}
      >
        {items.map((tab) => {
          // Для активной вкладки проверяем точное совпадение или начало пути
          // Если exactMatch = true, используем точное совпадение для всех вкладок
          // Если указан basePath, для главной страницы раздела - только точное совпадение
          const isActive = exactMatch
            ? pathname === tab.href
            : basePath && tab.href === basePath
            ? pathname === tab.href
            : pathname?.startsWith(tab.href) ?? false;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={clsx(
                'whitespace-nowrap rounded-lg px-[9px] py-[3.6px] text-[10.8px] font-medium transition',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                isActive
                  ? 'bg-indigo-500/20 text-indigo-100'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

