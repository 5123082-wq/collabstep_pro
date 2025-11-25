import { leftMenuConfig, type LeftMenuSection } from '@/components/app/LeftMenu.config';
import { filterRoles, type UserRole } from '@/lib/auth/roles';

type BuiltMenuSection = LeftMenuSection & { children?: LeftMenuSection['children'] };

export function buildLeftMenu(roles: UserRole[], visibleMenuIds?: string[]): BuiltMenuSection[] {
  // Используем переданные роли вместо вызова getUserRoles() для избежания проблем с гидратацией
  // getUserRoles() читает из localStorage, что может давать разные результаты на сервере и клиенте

  // Если visibleMenuIds не передан, используем все меню (для SSR совместимости)
  // В SSR контексте показываем все меню по умолчанию
  const effectiveVisibleMenuIds = visibleMenuIds ?? leftMenuConfig.map((section) => section.id);

  return leftMenuConfig
    .filter((section) => {
      // Проверяем видимость из настроек пользователя
      if (!effectiveVisibleMenuIds.includes(section.id)) {
        return false;
      }

      // Стандартная фильтрация по ролям (для доступа к функционалу)
      // Важно: это НЕ блокирует доступ к страницам, только видимость в меню
      if (!section.roles?.length) {
        return true;
      }

      return section.roles.some((role) => roles.includes(role));
    })
    .map((section) => {
      const children = section.children && Array.isArray(section.children) ? filterRoles(section.children, roles) : [];
      return { ...section, children: Array.isArray(children) ? children : [] };
    });
}
