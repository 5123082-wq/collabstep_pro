import '@/styles/globals.css';
import '@/styles/layout.css';
import '@/styles/dashboard.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ConsoleFilter from '@/components/util/ConsoleFilter';
import ThemeScript from '@/components/theme/ThemeScript';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { Toaster } from 'sonner';
import { Insights } from '@/components/util/Insights';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Определяем базовый URL для метаданных
const getMetadataBase = (): URL => {
  // Используем NEXT_PUBLIC_SITE_URL если установлен, иначе fallback на Vercel URL или localhost
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'https://collabverse.local';
  return new URL(siteUrl);
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'Collabverse',
  description: 'Платформа совместной работы. Этап 0.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <ConsoleFilter />
          {children}
          <Insights />
          <SpeedInsights />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
