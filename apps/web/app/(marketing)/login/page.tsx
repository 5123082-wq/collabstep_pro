import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import LoginForm from './login-form';
import DemoAdminButton from './demo-admin-button';

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
          <DemoAdminButton />
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
