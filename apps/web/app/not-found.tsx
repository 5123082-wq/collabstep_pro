import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">404</p>
        <h1 className="mt-4 text-3xl font-semibold">Страница не найдена</h1>
        <p className="mt-3 text-sm text-neutral-400">
          Мы не нашли страницу по указанному адресу. Проверьте ссылку или выберите один из доступных разделов ниже.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full border border-indigo-500/60 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            На главную
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            К проектам
          </Link>
        </div>
      </div>
    </div>
  );
}
