import type { ReactNode } from 'react';
import MarketingLayoutShell from '@/components/marketing/app/MarketingLayoutShell';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingLayoutShell>{children}</MarketingLayoutShell>;
}
