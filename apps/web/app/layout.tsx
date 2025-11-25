import '@/styles/globals.css';
import '@/styles/layout.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ConsoleFilter from '@/components/util/ConsoleFilter';
import ThemeScript from '@/components/theme/ThemeScript';
import { ThemeProvider } from '@/components/theme/ThemeContext';

// SpeedInsights только в production на Vercel - условный импорт
let SpeedInsights: React.ComponentType | null = null;
// Проверяем, что мы действительно на Vercel в production
if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SpeedInsights = require('@vercel/speed-insights/next').SpeedInsights;
  } catch {
    // Игнорируем ошибку, если модуль недоступен
  }
}

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Collabverse',
  description: 'Платформа совместной работы. Этап 0.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html 
      lang="ru" 
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <ConsoleFilter />
          {children}
          {SpeedInsights && <SpeedInsights />}
        </ThemeProvider>
      </body>
    </html>
  );
}
