'use client';

import Link from 'next/link';
import { marketingMenu } from '@/config/MarketingMenu.config';
import MobileMenu from './MobileMenu';

export default function MarketingNavbar() {

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Если мы на главной странице и ссылка якорная
    if (href.startsWith('/#')) {
      const id = href.replace('/', '');
      const element = document.querySelector(id);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold text-white transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>Collabverse</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6" aria-label="Основная навигация">
            {marketingMenu.map((item) => (
              <Link
                key={item.id}
                href={item.href ?? '#'}
                onClick={(e) => item.href && scrollToSection(e, item.href)}
                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="hidden text-sm font-medium text-neutral-400 hover:text-white transition-colors sm:block"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center justify-center rounded-full bg-white px-5 font-semibold text-black transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Начать бесплатно
          </Link>
          <div className="md:hidden">
             <MobileMenu menu={marketingMenu} />
          </div>
        </div>
      </div>
    </header>
  );
}
