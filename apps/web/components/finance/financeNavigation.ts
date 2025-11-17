export const financeNavigation = [
  {
    id: 'expenses',
    label: 'Расходы',
    href: '/finance/expenses',
    description: 'Управление расходами'
  },
  {
    id: 'wallet',
    label: 'Кошелёк',
    href: '/finance/wallet',
    description: 'Управление кошельком'
  },
  {
    id: 'escrow',
    label: 'Эскроу',
    href: '/finance/escrow',
    description: 'Эскроу-счета'
  },
  {
    id: 'invoices',
    label: 'Счета',
    href: '/finance/invoices',
    description: 'Управление счетами'
  },
  {
    id: 'plans',
    label: 'Тарифы',
    href: '/finance/plans',
    description: 'Тарифные планы'
  },
  {
    id: 'disputes',
    label: 'Споры',
    href: '/finance/disputes',
    description: 'Финансовые споры'
  }
] as const;

