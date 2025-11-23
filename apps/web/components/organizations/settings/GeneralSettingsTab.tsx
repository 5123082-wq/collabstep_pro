'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  isPublicInDirectory: boolean;
}

export function GeneralSettingsTab({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
    isPublicInDirectory: organization.isPublicInDirectory
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update organization');

      setMessage({ type: 'success', text: 'Organization updated successfully' });
      router.refresh();
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-[color:var(--text-primary)]">Общие настройки</h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Основная информация о вашей организации.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6 max-w-xl">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Название</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Описание</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={formData.isPublicInDirectory}
            onChange={(e) => setFormData({ ...formData, isPublicInDirectory: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPublic" className="text-sm text-[color:var(--text-secondary)]">
            Показывать в публичном каталоге организаций
          </label>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </div>
  );
}

