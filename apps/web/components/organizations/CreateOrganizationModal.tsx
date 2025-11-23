'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
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

      const data = await res.json();
      
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
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Создать организацию</ModalTitle>
          <ModalClose />
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="org-name" className="text-sm font-medium text-[color:var(--text-secondary)]">
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
                <label htmlFor="org-desc" className="text-sm font-medium text-[color:var(--text-secondary)]">
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
                <span className="text-sm font-medium text-[color:var(--text-secondary)]">Тип организации</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
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
                  <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
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
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

