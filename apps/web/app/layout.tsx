import '@/styles/globals.css';
import '@/styles/layout.css';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ConsoleFilter from '@/components/util/ConsoleFilter';
import ThemeScript from '@/components/theme/ThemeScript';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { Toaster } from 'sonner';

// SpeedInsights только в production на Vercel - условный импорт
const SpeedInsights =
  process.env.NODE_ENV === 'production' && process.env.VERCEL === '1'
    ? dynamic(() => import('@vercel/speed-insights/next').then((mod) => mod.SpeedInsights), {
        ssr: false
      })
    : null;

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
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
