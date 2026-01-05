'use client';

import { useState } from 'react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@/components/ui/modal';

type SaveProjectAsTemplateModalProps = {
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  projectType?: string;
  projectStage?: string;
  projectVisibility?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const KIND_OPTIONS = [
  { value: 'product', label: 'Продукт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'landing', label: 'Лендинг' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'operations', label: 'Операции' },
  { value: 'service', label: 'Сервис' },
  { value: 'internal', label: 'Внутренний' }
];

export default function SaveProjectAsTemplateModal({
  projectId,
  projectTitle,
  projectDescription,
  projectType,
  projectStage,
  projectVisibility,
  isOpen,
  onClose,
  onSuccess
}: SaveProjectAsTemplateModalProps) {
  const [formData, setFormData] = useState({
    title: projectTitle || '',
    kind: projectType || 'product',
    summary: projectDescription || '',
    projectType: projectType || '',
    projectStage: projectStage || '',
    projectVisibility: projectVisibility || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast('Введите название шаблона', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/pm/templates/from-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          title: formData.title,
          kind: formData.kind || undefined,
          summary: formData.summary || undefined,
          projectType: formData.projectType || undefined,
          projectStage: formData.projectStage || undefined,
          projectVisibility: formData.projectVisibility || undefined
        })
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Не удалось сохранить шаблон');
      }

      toast('Шаблон успешно создан', 'success');
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        title: projectTitle || '',
        kind: projectType || 'product',
        summary: projectDescription || '',
        projectType: projectType || '',
        projectStage: projectStage || '',
        projectVisibility: projectVisibility || ''
      });
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Не удалось сохранить шаблон', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-xl">
        <ModalHeader>
          <ModalTitle>Сохранить проект как шаблон</ModalTitle>
          <ModalDescription>
            Создайте шаблон на основе текущего проекта для быстрого создания похожих проектов в будущем.
          </ModalDescription>
          <ModalClose />
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="template-title" className="text-sm font-medium text-neutral-200">
              Название шаблона <span className="text-neutral-500">*</span>
            </label>
            <input
              id="template-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Название шаблона"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="template-kind" className="text-sm font-medium text-neutral-200">
              Тип
            </label>
            <select
              id="template-kind"
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="template-summary" className="text-sm font-medium text-neutral-200">
              Описание
            </label>
            <textarea
              id="template-summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Описание шаблона"
              rows={4}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none resize-none"
              maxLength={500}
            />
            <p className="text-xs text-neutral-500">
              {formData.summary.length}/500 символов
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="template-project-type" className="text-sm font-medium text-neutral-200">
              Тип проекта
            </label>
            <select
              id="template-project-type"
              value={formData.projectType || ''}
              onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Не выбран</option>
              <option value="product">Продуктовый</option>
              <option value="marketing">Маркетинг</option>
              <option value="operations">Операционный</option>
              <option value="service">Сервисный</option>
              <option value="internal">Внутренний</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="template-project-stage" className="text-sm font-medium text-neutral-200">
              Стадия проекта
            </label>
            <select
              id="template-project-stage"
              value={formData.projectStage || ''}
              onChange={(e) => setFormData({ ...formData, projectStage: e.target.value })}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Не выбрана</option>
              <option value="discovery">Исследование</option>
              <option value="design">Дизайн</option>
              <option value="build">Разработка</option>
              <option value="launch">Запуск</option>
              <option value="support">Поддержка</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="template-project-visibility" className="text-sm font-medium text-neutral-200">
              Видимость проекта
            </label>
            <select
              id="template-project-visibility"
              value={formData.projectVisibility || ''}
              onChange={(e) => setFormData({ ...formData, projectVisibility: e.target.value })}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Не выбрана</option>
              <option value="private">Приватный</option>
              <option value="public">Публичный</option>
            </select>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !formData.title.trim()}
            className={clsx(
              'rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
              submitting || !formData.title.trim()
                ? 'border-neutral-900 bg-neutral-950/60 text-neutral-600 cursor-not-allowed'
                : 'border-indigo-500/50 bg-indigo-500/15 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-500/25'
            )}
          >
            {submitting ? 'Сохранение...' : 'Сохранить шаблон'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

