'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClosurePreviewModal } from './ClosurePreviewModal';
// @ts-expect-error lucide-react icon types
import { AlertTriangle } from 'lucide-react';

type DangerZoneTabProps = {
  organizationId: string;
};

export function DangerZoneTab({ organizationId }: DangerZoneTabProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-[color:var(--text-primary)]">
          Опасная зона
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Необратимые действия с организацией.
        </p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">
              Закрыть организацию
            </h4>
            <p className="mt-2 text-sm text-red-700">
              При закрытии организации будут удалены:
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
              <li>Все проекты и задачи</li>
              <li>Все документы (будут заархивированы на 30 дней)</li>
              <li>Все участники потеряют доступ</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-red-900">
              ⚠️ Это действие необратимо!
            </p>
            <div className="mt-4">
              <Button
                variant="danger"
                onClick={() => setShowPreview(true)}
              >
                Проверить возможность закрытия
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <ClosurePreviewModal
          organizationId={organizationId}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
