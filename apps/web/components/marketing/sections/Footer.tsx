import Link from 'next/link';

const footerLinks = [
  { label: 'Главная', href: '/' },
  { label: 'Продукт', href: '/product' },
  { label: 'Для кого', href: '/audience' },
  { label: 'Проекты', href: '/open-projects' },
  { label: 'Специалисты', href: '/specialists' },
  { label: 'Подрядчики', href: '/contractors' },
  { label: 'Тарифы', href: '/pricing' },
  { label: 'Блог', href: '/blog' },
  { label: 'Вход', href: '/login' },
  { label: 'Регистрация', href: '/register' }
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div className="space-y-1">
          <p className="text-base font-semibold text-neutral-200">Collabverse</p>
          <p>Платформа для совместной работы креативных команд.</p>
        </div>
        <nav aria-label="Полезные ссылки">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
