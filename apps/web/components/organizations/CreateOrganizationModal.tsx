'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateOrganizationModal({ open, onOpenChange, onSuccess }: CreateOrganizationModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'open' | 'closed'>('closed');

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type,
          isPublicInDirectory: type === 'open',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || 'Failed to create organization');
      }

      await res.json(); // Consume response

      onOpenChange(false);
      setName('');
      setDescription('');
      setType('closed');

      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div style={{ maxWidth: '70vw', width: 'auto' }}>
        <ContentBlock
          as="form"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Создать организацию</h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                {error}
              </div>
            )}

              <div className="space-y-2">
              <label htmlFor="org-name" className="text-sm font-medium text-neutral-300">
                  Название
                </label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Acme Corp"
                  required
                />
              </div>

              <div className="space-y-2">
              <label htmlFor="org-desc" className="text-sm font-medium text-neutral-300">
                  Описание
                </label>
                <Textarea
                  id="org-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Чем занимается ваша организация?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
              <span className="text-sm font-medium text-neutral-300">Тип организации</span>
                <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-neutral-400">
                    <input
                      type="radio"
                      name="org-type"
                      value="closed"
                      checked={type === 'closed'}
                      onChange={() => setType('closed')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Закрытая (по приглашениям)
                  </label>
                <label className="flex items-center gap-2 text-sm text-neutral-400">
                    <input
                      type="radio"
                      name="org-type"
                      value="open"
                      checked={type === 'open'}
                      onChange={() => setType('open')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Открытая (публичная)
                  </label>
                </div>
              </div>
            </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </ContentBlock>
      </div>
    </div>
  );
}

