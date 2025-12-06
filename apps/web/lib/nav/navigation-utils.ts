import { leftMenuConfig } from '@/components/app/LeftMenu.config';
import type { NavigationItem } from '@/components/app/SectionNavigationBar';
import type { SectionHeaderMenuItem } from '@/components/common/SectionHeader';

/**
 * Универсальная утилита для получения навигации из LeftMenu.config
 * Используется для генерации хлебных крошек в AppTopbar
 * 
 * @param sectionId - ID секции из leftMenuConfig (например, 'pm', 'marketplace', 'admin')
 * @returns массив элементов навигации для SectionNavigationBar
 */
export function getNavigationFromConfig(sectionId: string): NavigationItem[] {
  const section = leftMenuConfig.find((s) => s.id === sectionId);

  if (!section?.children) {
    return [];
  }

  return section.children
    .filter((child) => child.type !== 'divider') // Исключаем разделители
    .map((child) => ({
      id: child.id,
      label: child.label,
      href: child.href,
      description: child.description || child.label
    }));
}

/**
 * Универсальная утилита для получения menuItems для SectionHeader
 * Используется внутри страниц для отображения хлебных крошек с активным состоянием
 * 
 * @param sectionId - ID секции из leftMenuConfig
 * @param pathname - текущий путь для определения активного пункта
 * @param exactMatchForBase - если true, для базового href используется точное совпадение (по умолчанию false)
 * @returns массив menuItems для SectionHeader
 */
export function getMenuItemsFromConfig(
  sectionId: string,
  pathname: string,
  exactMatchForBase: boolean = false
): SectionHeaderMenuItem[] {
  const section = leftMenuConfig.find((s) => s.id === sectionId);

  if (!section?.children) {
    return [];
  }

  const baseHref = section.href;

  return section.children
    .filter((child) => child.type !== 'divider') // Исключаем разделители
    .map((child) => {
      // Логика определения активного состояния
      let isActive: boolean;

      if (exactMatchForBase && child.href === baseHref) {
        // Для базового пути с точным совпадением
        isActive = pathname === child.href || pathname === `${child.href}/`;
      } else {
        // Для остальных - проверяем начало пути
        isActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
      }

      return {
        label: child.label,
        href: child.href,
        active: isActive,
      };
    });
}

/**
 * Хелперы для конкретных разделов (для удобства и обратной совместимости)
 */

export function getPMNavigation(): NavigationItem[] {
  return getNavigationFromConfig('pm');
}

export function getPMMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('pm', pathname);
}

export function getMarketplaceNavigation(): NavigationItem[] {
  return getNavigationFromConfig('marketplace');
}

export function getMarketplaceMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('marketplace', pathname);
}

export function getPerformersNavigation(): NavigationItem[] {
  return getNavigationFromConfig('performers');
}

export function getPerformersMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('performers', pathname);
}

export function getAIHubNavigation(): NavigationItem[] {
  return getNavigationFromConfig('ai-hub');
}

export function getAIHubMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('ai-hub', pathname);
}

export function getCommunityNavigation(): NavigationItem[] {
  return getNavigationFromConfig('community');
}

export function getCommunityMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('community', pathname);
}

export function getFinanceNavigation(): NavigationItem[] {
  return getNavigationFromConfig('finance');
}

export function getFinanceMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('finance', pathname);
}

export function getDocsNavigation(): NavigationItem[] {
  return getNavigationFromConfig('docs');
}

export function getDocsMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('docs', pathname);
}

export function getSupportNavigation(): NavigationItem[] {
  return getNavigationFromConfig('support');
}

export function getSupportMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('support', pathname);
}

export function getAdminNavigation(): NavigationItem[] {
  return getNavigationFromConfig('admin');
}

export function getAdminMenuItems(pathname: string): SectionHeaderMenuItem[] {
  return getMenuItemsFromConfig('admin', pathname, true); // admin использует exactMatch для базового пути
}

/**
 * Организации (org) - особый случай, так как требует dynamic orgId
 * Оставляем отдельную функцию, но используем тот же подход
 */
export function getOrgNavigation(orgId: string | null): NavigationItem[] {
  if (!orgId) {
    return [];
  }

  return [
    {
      id: 'team',
      label: 'Команда',
      href: `/org/${orgId}/team`,
      description: 'Управление командой'
    },
    {
      id: 'settings',
      label: 'Настройки',
      href: `/org/${orgId}/settings`,
      description: 'Настройки организации'
    },
    {
      id: 'finance',
      label: 'Финансы',
      href: `/org/${orgId}/finance`,
      description: 'Финансы организации'
    }
  ];
}

export function extractOrgIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/org\/([^/]+)/);
  return match?.[1] ?? null;
}

