'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryToast } from '@/lib/ui/useQueryToast';

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
      const payload = {
        email: state.email.trim(),
        password: state.password,
        returnTo: searchParams.get('returnTo') ?? undefined
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState((prev) => ({ ...prev, error: data?.error ?? 'Неверная почта или пароль', loading: false }));
        return;
      }

      const data = (await response.json().catch(() => null)) as { redirect?: string } | null;
      const target = data?.redirect ?? '/app/dashboard';
      router.push(target);
    } catch (error) {
      setState((prev) => ({ ...prev, error: 'Не удалось выполнить вход. Повторите попытку.', loading: false }));
    }
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
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
  );
}
