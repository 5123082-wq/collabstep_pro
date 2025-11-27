'use client';

import { useState } from 'react';

export default function SeedTestProjectPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/dev/seed-test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.ok) {
        setResult(data.data);
      } else {
        setError(data.error || 'Ошибка при создании проекта');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Создание тестового проекта</h1>
      
      <button
        onClick={handleSeed}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Создание...' : 'Создать тестовый проект'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Ошибка: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h2 className="font-bold mb-2">Проект успешно создан!</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          <div className="mt-4">
            <a
              href="/pm/projects"
              className="text-blue-600 hover:underline"
            >
              Перейти к проектам →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
