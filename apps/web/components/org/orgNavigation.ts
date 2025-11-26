import type { NavigationItem } from '@/components/app/SectionNavigationBar';

/**
 * Генерирует навигацию для раздела организации на основе orgId
 */
export function getOrgNavigation(orgId: string | null): readonly NavigationItem[] {
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
  ] as const;
}

/**
 * Извлекает orgId из пути
 */
export function extractOrgIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/org\/([^/]+)/);
  return match?.[1] ?? null;
}
