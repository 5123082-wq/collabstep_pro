'use client';

import { useState, type ChangeEvent, type FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const MIN_PASSWORD_LENGTH = 6;

type FormState = {
  name: string;
  email: string;
  password: string;
  consent: boolean;
  error: string | null;
  loading: boolean;
};

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  password: '',
  consent: false,
  error: null,
  loading: false
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password: string): { strength: 'weak' | 'medium' | 'strong'; score: number } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: 'weak', score };
  if (score <= 3) return { strength: 'medium', score };
  return { strength: 'strong', score };
}

export default function RegisterForm() {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const passwordStrength = useMemo(() => {
    if (!state.password) return null;
    return getPasswordStrength(state.password);
  }, [state.password]);

  const validateField = (field: 'name' | 'email' | 'password', value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) {
          return 'Имя обязательно для заполнения';
        }
        if (value.trim().length < 2) {
          return 'Имя должно содержать минимум 2 символа';
        }
        return undefined;
      case 'email':
        if (!value.trim()) {
          return 'Email обязателен для заполнения';
        }
        if (!isValidEmail(value.trim())) {
          return 'Введите корректный email адрес';
        }
        return undefined;
      case 'password':
        if (!value) {
          return 'Пароль обязателен для заполнения';
        }
        if (value.length < MIN_PASSWORD_LENGTH) {
          return `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (field: 'name' | 'email' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState((prev) => ({ ...prev, [field]: value, error: null }));

    // Валидация в реальном времени
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field: 'name' | 'email' | 'password') => () => {
    const value = state[field];
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleConsentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, consent: event.target.checked, error: null }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.loading) {
      return;
    }

    // Валидация всех полей
    const nameError = validateField('name', state.name);
    const emailError = validateField('email', state.email);
    const passwordError = validateField('password', state.password);

    setFieldErrors({
      ...(nameError ? { name: nameError } : {}),
      ...(emailError ? { email: emailError } : {}),
      ...(passwordError ? { password: passwordError } : {})
    });

    if (nameError || emailError || passwordError || !state.consent) {
      setState((prev) => ({
        ...prev,
        error: !state.consent ? 'Необходимо подтвердить согласие с условиями использования' : 'Проверьте правильность заполнения полей'
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: state.name.trim(),
          email: state.email.trim(),
          password: state.password
        })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState((prev) => ({ ...prev, error: data?.error ?? 'Не удалось завершить регистрацию.', loading: false }));
        return;
      }

      const data = (await response.json().catch(() => null)) as { redirect?: string } | null;
      // Редирект на страницу входа (API уже добавит toast параметр)
      const redirectPath = data?.redirect ?? '/login?toast=register-success';
      router.push(redirectPath);
    } catch (error) {
      setState((prev) => ({ ...prev, error: 'Не удалось завершить регистрацию. Проверьте подключение к интернету.', loading: false }));
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="block text-sm text-neutral-300">
          Имя
          <input
            type="text"
            name="name"
            value={state.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
            className={`mt-1 w-full rounded-lg border bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none ${fieldErrors.name
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-neutral-800 focus:border-indigo-400'
              }`}
            placeholder="Анна Смирнова"
            required
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          />
        </label>
        {fieldErrors.name && (
          <p id="name-error" role="alert" className="mt-1 text-xs text-rose-300">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-neutral-300">
          Почта
          <input
            type="email"
            name="email"
            value={state.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            className={`mt-1 w-full rounded-lg border bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none ${fieldErrors.email
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-neutral-800 focus:border-indigo-400'
              }`}
            placeholder="user@collabverse.dev"
            required
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
        </label>
        {fieldErrors.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-rose-300">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-neutral-300">
          Пароль
          <input
            type="password"
            name="password"
            value={state.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            className={`mt-1 w-full rounded-lg border bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none ${fieldErrors.password
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-neutral-800 focus:border-indigo-400'
              }`}
            placeholder="Минимум 6 символов"
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : passwordStrength ? 'password-strength' : undefined}
          />
        </label>
        {fieldErrors.password && (
          <p id="password-error" role="alert" className="mt-1 text-xs text-rose-300">
            {fieldErrors.password}
          </p>
        )}
        {state.password && !fieldErrors.password && passwordStrength && (
          <div id="password-strength" className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${passwordStrength.strength === 'weak'
                      ? 'bg-rose-500 w-1/3'
                      : passwordStrength.strength === 'medium'
                        ? 'bg-amber-500 w-2/3'
                        : 'bg-emerald-500 w-full'
                    }`}
                />
              </div>
              <span
                className={`text-xs font-medium ${passwordStrength.strength === 'weak'
                    ? 'text-rose-400'
                    : passwordStrength.strength === 'medium'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
              >
                {passwordStrength.strength === 'weak'
                  ? 'Слабый'
                  : passwordStrength.strength === 'medium'
                    ? 'Средний'
                    : 'Сильный'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {passwordStrength.strength === 'weak' && 'Используйте заглавные и строчные буквы, цифры и символы'}
              {passwordStrength.strength === 'medium' && 'Пароль можно усилить'}
              {passwordStrength.strength === 'strong' && 'Отличный пароль'}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={state.consent}
            onChange={handleConsentChange}
            className="mt-1 h-4 w-4 border-neutral-600 text-indigo-500 focus:ring-indigo-500"
            required
            aria-invalid={!state.consent && state.error?.includes('согласие')}
          />
          <span>Я согласен с условиями использования</span>
        </label>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={state.loading}
        className="w-full rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-500/60"
      >
        {state.loading ? 'Регистрация…' : 'Создать аккаунт'}
      </button>
    </form>
  );
}
