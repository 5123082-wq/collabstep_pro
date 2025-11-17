export const adminNavigation = [
  {
    id: 'overview',
    label: 'Обзор',
    href: '/admin',
    description: 'Обзор системы'
  },
  {
    id: 'features',
    label: 'Фичи & Разделы',
    href: '/admin/features',
    description: 'Управление функциями и разделами'
  },
  {
    id: 'users',
    label: 'Пользователи',
    href: '/admin/users',
    description: 'Управление пользователями'
  },
  {
    id: 'roles',
    label: 'Роли & Разрешения',
    href: '/admin/roles',
    description: 'Управление ролями и разрешениями'
  },
  {
    id: 'segments',
    label: 'Сегменты',
    href: '/admin/segments',
    description: 'Управление сегментами пользователей'
  },
  {
    id: 'audit',
    label: 'Аудит',
    href: '/admin/audit',
    description: 'Журнал аудита'
  },
  {
    id: 'releases',
    label: 'Релизы',
    href: '/admin/releases',
    description: 'Управление релизами'
  },
  {
    id: 'support',
    label: 'Support Tools',
    href: '/admin/support',
    description: 'Инструменты поддержки'
  }
] as const;

