import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Вход в Collabverse',
  description: 'Войдите в Collabverse, чтобы управлять проектами и профилем.',
  openGraph: {
    title: 'Вход в Collabverse',
    description: 'Войдите в Collabverse, чтобы управлять проектами и профилем.',
    url: '/login',
    type: 'website'
  }
};

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 sm:px-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">Вход</h1>
        <p className="text-neutral-300">Используйте корпоративную почту для входа в Collabverse.</p>
      </header>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <section className="mt-8 space-y-3">
        <p className="text-center text-sm text-neutral-400">Попробуйте платформу без регистрации.</p>
        <div className="space-y-2">
          <form method="POST" action="/api/auth/login-demo" className="space-y-2">
            <input type="hidden" name="role" value="admin" />
            <button
              type="submit"
              className="w-full rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-amber-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Войти демо-админом
            </button>
          </form>
        </div>
      </section>
      <p className="mt-6 text-center text-sm text-neutral-400">
        Нет аккаунта?{' '}
        <Link
          href="/register"
          className="font-semibold text-indigo-300 transition hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          Создать аккаунт
        </Link>
      </p>
    </main>
  );
}
