import Link from 'next/link';

const heroHighlights = [
  'AI-агенты помогают запускать проекты',
  'Маркетплейс услуг и специалистов',
  'Управление задачами и бюджетом в одном месте'
];

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 hero-gradient">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-24 text-center sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Collabverse</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Платформа для креативных и продуктовых команд
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-neutral-300">
            Соберите команду мечты, запустите AI-агента и управляйте проектами в одной экосистеме.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Начать бесплатно
          </Link>
          <Link
            href="/product"
            className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
          >
            Посмотреть платформу
          </Link>
        </div>
        <ul className="mx-auto flex max-w-4xl flex-col gap-2 text-sm text-neutral-400 sm:flex-row sm:flex-wrap sm:justify-center">
          {heroHighlights.map((item) => (
            <li key={item} className="rounded-full border border-neutral-800 px-4 py-2">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
