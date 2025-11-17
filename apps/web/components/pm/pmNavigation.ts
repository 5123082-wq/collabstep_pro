import { PM_HUB_PATH } from '@/components/app/LeftMenu.config';

export const pmNavigation = [
  {
    id: 'dashboard',
    label: 'Дашборд',
    href: PM_HUB_PATH,
    description: 'Обзор проектов и задач'
  },
  {
    id: 'projects',
    label: 'Проекты',
    href: `${PM_HUB_PATH}/projects`,
    description: 'Управление всеми проектами'
  },
  {
    id: 'tasks',
    label: 'Задачи',
    href: `${PM_HUB_PATH}/tasks`,
    description: 'Просмотр и управление задачами'
  },
  {
    id: 'archive',
    label: 'Архив',
    href: `${PM_HUB_PATH}/archive`,
    description: 'Архивные проекты и задачи'
  }
] as const;

