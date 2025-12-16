'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ClosureBlockersCard } from './ClosureBlockersCard';
import { ClosureConfirmDialog } from './ClosureConfirmDialog';
// @ts-expect-error lucide-react icon types
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';

type ClosureBlocker = {
  moduleId: string;
  moduleName?: string;
  type: 'financial' | 'data';
  severity: 'blocking' | 'warning' | 'info';
  id: string;
  title: string;
  description: string;
  actionRequired?: string;
  actionUrl?: string;
};

type ArchivableData = {
  moduleId: string;
  moduleName: string;
  type: string;
  id: string;
  title: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
};

type ClosurePreview = {
  canClose: boolean;
  blockers: ClosureBlocker[];
  warnings: ClosureBlocker[];
  archivableData: ArchivableData[];
  impact: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
    expenses: number;
  };
};

type ClosurePreviewModalProps = {
  organizationId: string;
  onClose: () => void;
};

export function ClosurePreviewModal({
  organizationId,
  onClose
}: ClosurePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/organizations/${organizationId}/closure/preview`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || 'Не удалось загрузить preview');
      }
      
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
      console.error('Error fetching preview:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchPreview();
    // Получаем название организации для подтверждения
    void fetch(`/api/organizations/${organizationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.organization?.name) {
          setOrganizationName(data.organization.name);
        } else if (data.name) {
          setOrganizationName(data.name);
        }
      })
      .catch(() => {
        // Игнорируем ошибку, название не критично
      });
  }, [organizationId, fetchPreview]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 Б';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const groupArchivableDataByModule = (data: ArchivableData[]) => {
    const grouped = new Map<string, { moduleName: string; items: ArchivableData[]; totalSize: number }>();
    
    for (const item of data) {
      const existing = grouped.get(item.moduleId);
      if (existing) {
        existing.items.push(item);
        existing.totalSize += item.sizeBytes || 0;
      } else {
        grouped.set(item.moduleId, {
          moduleName: item.moduleName,
          items: [item],
          totalSize: item.sizeBytes || 0
        });
      }
    }
    
    return Array.from(grouped.values());
  };

  if (loading) {
    return (
      <Modal open onOpenChange={onClose}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Закрытие организации</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--text-secondary)]" />
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  if (error || !preview) {
    return (
      <Modal open onOpenChange={onClose}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Ошибка</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error || 'Не удалось загрузить данные'}</p>
              <Button onClick={onClose}>Закрыть</Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const groupedArchivableData = groupArchivableDataByModule(preview.archivableData);

  return (
    <>
      <Modal open onOpenChange={onClose}>
        <ModalContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>Закрытие организации</ModalTitle>
          </ModalHeader>

          <ModalBody>
            {preview.canClose ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">
                      Закрытие возможно
                    </h4>
                    <p className="mt-1 text-sm text-green-700">
                      Все финансовые обязательства урегулированы.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-[color:var(--text-primary)] mb-2">
                      Будет удалено:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-[color:var(--text-secondary)] space-y-1">
                      <li>{preview.impact.projects} проектов</li>
                      <li>{preview.impact.tasks} задач</li>
                      <li>{preview.impact.members} участников</li>
                      <li>{preview.impact.invites} приглашений</li>
                      <li>{preview.impact.documents} документов (будут заархивированы)</li>
                      {preview.impact.expenses > 0 && (
                        <li>{preview.impact.expenses} расходов</li>
                      )}
                    </ul>
                  </div>

                  {groupedArchivableData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[color:var(--text-primary)] mb-2">
                        Будет заархивировано:
                      </h4>
                      <div className="space-y-2">
                        {groupedArchivableData.map((group) => (
                          <div
                            key={group.moduleName}
                            className="flex items-center gap-2 p-3 bg-[color:var(--surface-muted)] rounded-lg"
                          >
                            <FileText className="h-4 w-4 text-[color:var(--text-secondary)]" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                                {group.moduleName}
                              </p>
                              <p className="text-xs text-[color:var(--text-secondary)]">
                                {group.items.length} {group.items.length === 1 ? 'элемент' : 'элементов'} • {formatBytes(group.totalSize)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                        Архив будет доступен для скачивания в течение 30 дней
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900">
                      Закрытие невозможно
                    </h4>
                    <p className="mt-1 text-sm text-red-700">
                      Обнаружены блокирующие факторы.
                    </p>
                  </div>
                </div>

                <ClosureBlockersCard blockers={preview.blockers} warnings={preview.warnings} />
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            {preview.canClose ? (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowConfirm(true)}
                >
                  Закрыть организацию
                </Button>
              </>
            ) : (
              <Button onClick={onClose}>Понятно</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {showConfirm && preview.canClose && organizationName && (
        <ClosureConfirmDialog
          organizationId={organizationId}
          organizationName={organizationName}
          onClose={() => {
            setShowConfirm(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
