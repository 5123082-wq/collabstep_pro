export type NavChild = {
  id: string;
  label: string;
  href: string;
  cta?: { label: string; href: string };
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: NavChild[];
};

export const marketingMenu: NavItem[] = [
  {
    id: 'features',
    label: 'Возможности',
    href: '/#features'
  },
  {
    id: 'collaboration',
    label: 'Как это работает',
    href: '/#collaboration'
  },
  {
    id: 'roles',
    label: 'Для кого',
    href: '/#roles'
  },
  {
    id: 'pricing',
    label: 'Тарифы',
    href: '/pricing'
  }
];
