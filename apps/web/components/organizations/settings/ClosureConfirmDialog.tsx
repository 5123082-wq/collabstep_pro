'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// @ts-expect-error lucide-react icon types
import { AlertTriangle } from 'lucide-react';

type ClosureConfirmDialogProps = {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
};

export function ClosureConfirmDialog({
  organizationId,
  organizationName,
  onClose
}: ClosureConfirmDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === organizationName;

  const handleClose = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${organizationId}/closure/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        if (errorData.error === 'CANNOT_CLOSE') {
          throw new Error(errorData.details || 'Организация не может быть закрыта из-за активных блокеров');
        }
        
        throw new Error(errorData.details || errorData.message || 'Не удалось закрыть организацию');
      }

      // Успешное закрытие
      router.push('/org');
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при закрытии организации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open onOpenChange={onClose}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Подтверждение закрытия организации</ModalTitle>
          <ModalDescription>
            Это действие необратимо. Все данные будут удалены, а документы заархивированы на 30 дней.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  Внимание! Это действие необратимо.
                </p>
                <p className="mt-1 text-sm text-red-700">
                  После закрытия организации вы не сможете восстановить проекты, задачи и другие данные.
                  Документы будут доступны для скачивания в течение 30 дней.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="confirm-text" className="text-sm font-medium text-[color:var(--text-primary)]">
                Для подтверждения введите название организации:
              </label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={organizationName}
                disabled={isLoading}
                className="font-mono"
              />
              <p className="text-xs text-[color:var(--text-secondary)]">
                Введите <strong>{organizationName}</strong> для подтверждения
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={handleClose}
            disabled={!isConfirmed || isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Закрытие...' : 'Закрыть организацию'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
