'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { usePathname } from 'next/navigation';

/**
 * Speed Insights component для отслеживания производительности.
 * Использует usePathname для точного отслеживания маршрутов.
 * Это client component, чтобы не отключать SSR на layout.
 */
export function Insights() {
  const pathname = usePathname();

  return <SpeedInsights route={pathname} />;
}

