'use client';

import { useState } from 'react';

export default function DemoAdminButton() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('role', 'admin');

      const response = await fetch('/api/auth/login-demo', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Важно для установки cookies
      });

      // Проверяем статус ответа
      // Fetch не следует редиректам для POST запросов автоматически,
      // поэтому всегда редиректим вручную после успешного ответа
      if (response.status >= 200 && response.status < 400) {
        // Редиректим на дашборд после успешной установки cookie
        window.location.href = '/app/dashboard';
      } else {
        // Обработка ошибки
        const data = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        console.error('Ошибка входа:', data.error || 'Неизвестная ошибка');
        alert(data.error || 'Не удалось войти. Попробуйте еще раз.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      alert('Не удалось выполнить вход. Повторите попытку.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input type="hidden" name="role" value="admin" />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-amber-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Вход…' : 'Войти демо-админом'}
      </button>
    </form>
  );
}

