import type { DemoRole } from '@/lib/auth/demo-session';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';

export type UserRole =
  | 'FOUNDER'
  | 'SPECIALIST'
  | 'CONTRACTOR'
  | 'PM'
  | 'ADMIN'
  | 'MODERATOR'
  | 'OBSERVER';

export type UserType = 'performer' | 'marketer' | null;

const DEFAULT_ROLES: UserRole[] = ['FOUNDER', 'PM'];
const FULL_ADMIN_ROLES: UserRole[] = ['FOUNDER', 'PM', 'ADMIN', 'MODERATOR', 'SPECIALIST', 'CONTRACTOR', 'OBSERVER'];

function uniqueRoles(roles: UserRole[]): UserRole[] {
  return [...new Set(roles)];
}

const FINANCE_ALLOWED = new Set<UserRole>(['FOUNDER', 'PM', 'ADMIN']);
const ADMIN_ALLOWED = new Set<UserRole>(['ADMIN', 'MODERATOR']);
const MARKETPLACE_ALLOWED = new Set<UserRole>(['SPECIALIST', 'CONTRACTOR', 'FOUNDER', 'PM', 'ADMIN']);

export function getUserRoles(): UserRole[] {
  if (typeof window !== 'undefined') {
    const persisted = window.localStorage.getItem('cv-roles');
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as UserRole[];
        if (Array.isArray(parsed) && parsed.every((role) => typeof role === 'string')) {
          return parsed as UserRole[];
        }
      } catch (error) {
        console.warn('Не удалось разобрать роли из localStorage', error);
      }
    }
  }

  // Если есть тип пользователя, автоматически добавляем соответствующие роли
  const userType = getUserType();
  if (userType === 'performer') {
    return ['SPECIALIST', 'CONTRACTOR'];
  }

  return DEFAULT_ROLES;
}

export function setUserRoles(roles: UserRole[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cv-roles', JSON.stringify(roles));
  }
}

export function getUserType(): UserType {
  if (typeof window !== 'undefined') {
    const persisted = window.localStorage.getItem('cv-user-type');
    if (persisted === 'performer' || persisted === 'marketer') {
      return persisted;
    }
  }
  return null;
}

export function setUserType(type: UserType): void {
  if (typeof window !== 'undefined') {
    if (type) {
      window.localStorage.setItem('cv-user-type', type);
      
      // Автоматически устанавливаем соответствующие роли
      if (type === 'performer') {
        setUserRoles(['SPECIALIST', 'CONTRACTOR']);
      } else if (type === 'marketer') {
        // Для маркетолога оставляем базовые роли
        setUserRoles(DEFAULT_ROLES);
      }
    } else {
      window.localStorage.removeItem('cv-user-type');
    }
    // Применение предустановки меню происходит на уровне UI (AccountMenu/UserProfileSettingsModal)
    // для избежания циклических зависимостей
    window.dispatchEvent(new CustomEvent<UserType>('cv-user-type-change', { detail: type }));
  }
}

export function getRolesForDemoRole(role: DemoRole): UserRole[] {
  if (role === 'admin') {
    return uniqueRoles(FULL_ADMIN_ROLES);
  }

  return uniqueRoles(DEFAULT_ROLES);
}

export function getRolesForDemoAccount(email: string | null | undefined, role: DemoRole): UserRole[] {
  if (isDemoAdminEmail(email)) {
    return uniqueRoles(FULL_ADMIN_ROLES);
  }

  return getRolesForDemoRole(role);
}

export function canAccessFinance(roles: UserRole[]): boolean {
  return roles.some((role) => FINANCE_ALLOWED.has(role));
}

export function canAccessAdmin(roles: UserRole[]): boolean {
  return roles.some((role) => ADMIN_ALLOWED.has(role));
}

// Эти функции больше не используются для блокировки доступа,
// но оставляем их для обратной совместимости с другими частями кода
export function canAccessMarketplace(roles: UserRole[]): boolean {
  // Тип пользователя больше не блокирует доступ, только влияет на предустановки меню
  return roles.some((role) => MARKETPLACE_ALLOWED.has(role));
}

export function canAccessMarketing(): boolean {
  // Тип пользователя больше не блокирует доступ, только влияет на предустановки меню
  // Все пользователи имеют доступ к маркетингу, но по умолчанию видимость зависит от типа
  return true;
}

export function filterRoles<T extends { roles?: UserRole[] }>(items: T[], roles: UserRole[]): T[] {
  return items.filter((item) => {
    if (!item.roles?.length) {
      return true;
    }

    return item.roles.some((role) => roles.includes(role));
  });
}
