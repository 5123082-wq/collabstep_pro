import type { Metadata } from 'next';
import type { ReactNode } from 'react';
export const metadata: Metadata = {
  title: 'Каталог Collabverse',
  description: 'Discovery-first лента шаблонов, готовых решений и услуг для быстрого старта проекта.'
};

export default function MarketLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-10 pb-16">{children}</div>;
}
