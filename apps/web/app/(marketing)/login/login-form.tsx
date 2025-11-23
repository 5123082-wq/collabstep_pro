'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryToast } from '@/lib/ui/useQueryToast';
import { signIn } from 'next-auth/react';

const TOASTS = {
  'auth-required': { message: 'Нужно войти в систему', tone: 'warning' },
  'register-success': { message: 'Регистрация успешна! Войдите в систему, используя свои учетные данные.', tone: 'success' }
} as const;

type FormState = {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
};

const initialState: FormState = {
  email: '',
  password: '',
  error: null,
  loading: false
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState(initialState);
  useQueryToast(TOASTS);

  const handleChange = (field: 'email' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.loading) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Используем кастомный API роут для credentials логина
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
          returnTo: searchParams.get('returnTo') ?? '/app/dashboard'
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setState((prev) => ({ ...prev, error: data.error || 'Неверная почта или пароль', loading: false }));
        return;
      }

      // Редиректим на целевую страницу
      const target = data.redirect || searchParams.get('returnTo') || '/app/dashboard';
      router.push(target);
      router.refresh();
    } catch (error) {
      setState((prev) => ({ ...prev, error: 'Не удалось выполнить вход. Повторите попытку.', loading: false }));
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: searchParams.get('returnTo') ?? '/app/dashboard' })}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Войти через Google
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-neutral-800"></div>
        <span className="mx-4 flex-shrink-0 text-xs text-neutral-500">ИЛИ</span>
        <div className="flex-grow border-t border-neutral-800"></div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block text-sm text-neutral-300">
          Email
          <input
            type="email"
            name="email"
            value={state.email}
            onChange={handleChange('email')}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-indigo-400 focus:outline-none"
            placeholder="name@company.com"
            required
          />
        </label>
        <label className="block text-sm text-neutral-300">
          Пароль
          <input
            type="password"
            name="password"
            value={state.password}
            onChange={handleChange('password')}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-indigo-400 focus:outline-none"
            placeholder="••••••••"
            minLength={6}
            required
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-rose-300">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={state.loading}
          className="w-full rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-500/60"
        >
          {state.loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
