import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import RegisterForm from './register-form';

export const metadata: Metadata = {
  title: 'Регистрация в Collabverse',
  description: 'Выберите роль и зарегистрируйтесь в Collabverse: заказчик, специалист или подрядчик.',
  openGraph: {
    title: 'Регистрация в Collabverse',
    description: 'Выберите роль и зарегистрируйтесь в Collabverse.',
    url: '/register',
    type: 'website'
  }
};

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">Регистрация</h1>
        <p className="text-neutral-300">Создайте аккаунт для доступа к Collabverse.</p>
      </header>
      <Suspense fallback={<div className="mt-8 text-center text-neutral-400">Загрузка формы...</div>}>
        <RegisterForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-neutral-400">
        Уже есть аккаунт?{' '}
        <Link
          href="/login"
          className="font-semibold text-indigo-300 transition hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          Войти
        </Link>
      </p>
    </main>
  );
}
