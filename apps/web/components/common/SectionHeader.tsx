import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SECTION_MENU_CLASSNAMES } from './layoutPresets';

export type SectionHeaderMenuItem = {
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
};

type SectionHeaderProps = {
  title: string;
  actions?: ReactNode;
  menuItems?: SectionHeaderMenuItem[];
};

export default function SectionHeader({ title, actions, menuItems }: SectionHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {menuItems && menuItems.length > 0 ? (
        <div className="-mx-4 sm:mx-0">
          <nav
            className={SECTION_MENU_CLASSNAMES.nav}
            aria-label={`Меню раздела ${title}`}
          >
            <ul className={SECTION_MENU_CLASSNAMES.list}>
              {menuItems.map((item) => (
                <li key={item.href} className={SECTION_MENU_CLASSNAMES.item}>
                  <Link
                    href={item.href}
                    className={cn(
                      SECTION_MENU_CLASSNAMES.link,
                      'border text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                      item.active
                        ? 'border-indigo-400/80 bg-indigo-500/20 text-white shadow-[0_16px_32px_-20px_rgba(99,102,241,0.55)]'
                        : 'border-transparent bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:text-neutral-100'
                    )}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
