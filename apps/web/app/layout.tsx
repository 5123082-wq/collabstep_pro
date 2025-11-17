import '@/styles/globals.css';
import '@/styles/layout.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ConsoleFilter from '@/components/util/ConsoleFilter';
import ThemeScript from '@/components/theme/ThemeScript';
import { ThemeProvider } from '@/components/theme/ThemeContext';

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
        </ThemeProvider>
      </body>
    </html>
  );
}
