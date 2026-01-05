'use client';

import { useState, useEffect, useCallback } from 'react';
// @ts-expect-error lucide-react icon types
import { Plus, Edit, Trash2, RefreshCw, FileText, Palette, Globe, Megaphone, Sparkles } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import clsx from 'clsx';
import { ContentBlock } from '@/components/ui/content-block';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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

type ProjectTemplate = {
  id: string;
  title: string;
  kind: string;
  summary: string;
  projectType?: string;
  projectStage?: string;
  projectVisibility?: string;
};

type TemplateFormData = {
  title: string;
  kind: string;
  summary: string;
  projectType?: string;
  projectStage?: string;
  projectVisibility?: string;
};

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  product: FileText,
  brand: Palette,
  landing: Globe,
  marketing: Megaphone,
  default: Sparkles
};

const KIND_LABELS: Record<string, string> = {
  product: 'Продукт',
  brand: 'Бренд',
  landing: 'Лендинг',
  marketing: 'Маркетинг',
  operations: 'Операции',
  service: 'Сервис',
  internal: 'Внутренний'
};

const KIND_COLORS: Record<string, string> = {
  product: 'indigo',
  brand: 'purple',
  landing: 'emerald',
  marketing: 'orange',
  operations: 'blue',
  service: 'cyan',
  internal: 'neutral'
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

function getKindIcon(kind: string): React.ComponentType<{ className?: string }> {
  return KIND_ICONS[kind] ?? KIND_ICONS.default!;
}

function getKindLabel(kind: string): string {
  return KIND_LABELS[kind] || kind;
}

function getKindColor(kind: string): string {
  return KIND_COLORS[kind] || 'neutral';
}

function getColorClasses(color: string) {
  const colorMap: Record<string, { border: string; bg: string; text: string; bgIcon: string; textIcon: string }> = {
    indigo: {
      border: 'border-indigo-500/60',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-300',
      bgIcon: 'bg-indigo-500/20',
      textIcon: 'text-indigo-300'
    },
    purple: {
      border: 'border-purple-500/60',
      bg: 'bg-purple-500/10',
      text: 'text-purple-300',
      bgIcon: 'bg-purple-500/20',
      textIcon: 'text-purple-300'
    },
    emerald: {
      border: 'border-emerald-500/60',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      bgIcon: 'bg-emerald-500/20',
      textIcon: 'text-emerald-300'
    },
    orange: {
      border: 'border-orange-500/60',
      bg: 'bg-orange-500/10',
      text: 'text-orange-300',
      bgIcon: 'bg-orange-500/20',
      textIcon: 'text-orange-300'
    },
    blue: {
      border: 'border-blue-500/60',
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      bgIcon: 'bg-blue-500/20',
      textIcon: 'text-blue-300'
    },
    cyan: {
      border: 'border-cyan-500/60',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-300',
      bgIcon: 'bg-cyan-500/20',
      textIcon: 'text-cyan-300'
    },
    neutral: {
      border: 'border-neutral-500/60',
      bg: 'bg-neutral-500/10',
      text: 'text-neutral-300',
      bgIcon: 'bg-neutral-500/20',
      textIcon: 'text-neutral-300'
    }
  };
  return colorMap[color] || colorMap.neutral!;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    title: '',
    kind: 'product',
    summary: '',
    projectType: '',
    projectStage: '',
    projectVisibility: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/templates', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      if (!response.ok) {
        throw new Error('Не удалось загрузить шаблоны');
      }
      const data = (await response.json()) as { items: ProjectTemplate[] };
      setTemplates(data.items);
    } catch (err) {
      console.error('[AdminTemplatesPage] Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast('Не удалось загрузить шаблоны', 'warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ title: '', kind: 'product', summary: '', projectType: '', projectStage: '', projectVisibility: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      kind: template.kind,
      summary: template.summary,
      projectType: template.projectType || '',
      projectStage: template.projectStage || '',
      projectVisibility: template.projectVisibility || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) {
        return;
      }

      setDeletingIds((prev) => new Set(prev).add(id));
      try {
        const response = await fetch(`/api/admin/templates/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Не удалось удалить шаблон');
        }

        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast('Шаблон удалён', 'success');
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Не удалось удалить шаблон', 'warning');
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.kind.trim()) {
      toast('Заполните обязательные поля (название и тип)', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate.id}`
        : '/api/admin/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          kind: formData.kind,
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

      const data = (await response.json()) as { item: ProjectTemplate };
      if (editingTemplate) {
        setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? data.item : t)));
        toast('Шаблон обновлён', 'success');
      } else {
        setTemplates((prev) => [...prev, data.item]);
        toast('Шаблон создан', 'success');
      }

      setIsModalOpen(false);
      setEditingTemplate(null);
      setFormData({ title: '', kind: 'product', summary: '', projectType: '', projectStage: '', projectVisibility: '' });
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Не удалось сохранить шаблон', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Шаблоны проектов"
        description="Управление административными шаблонами для создания проектов"
        actions={
          <>
            <button
              onClick={() => void loadTemplates()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Обновить список"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
              Обновить
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              Создать шаблон
            </button>
          </>
        }
      />

      {/* Loading State */}
      {loading && (
        <ContentBlock variant="dashed" className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-neutral-400">Загрузка шаблонов...</p>
        </ContentBlock>
      )}

      {/* Error State */}
      {error && !loading && (
        <ContentBlock variant="error">
          <p className="text-sm text-rose-100">{error}</p>
          <button
            onClick={() => void loadTemplates()}
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Повторить попытку
          </button>
        </ContentBlock>
      )}

      {/* Templates Grid */}
      {!loading && !error && (
        <>
          {templates.length === 0 ? (
            <ContentBlock variant="dashed" className="text-center">
              <Sparkles className="mx-auto h-12 w-12 text-neutral-600" />
              <p className="mt-4 text-sm text-neutral-400">Нет шаблонов</p>
              <button
                onClick={handleCreate}
                className="mt-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                Создать первый шаблон
              </button>
            </ContentBlock>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const Icon = getKindIcon(template.kind);
                const color = getKindColor(template.kind);
                const colorClasses = getColorClasses(color);
                const isDeleting = deletingIds.has(template.id);

                return (
                  <ContentBlock key={template.id} size="sm" className="relative">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div
                          className={clsx(
                            'flex h-10 w-10 items-center justify-center rounded-xl',
                            colorClasses.bgIcon,
                            colorClasses.textIcon
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(template)}
                            disabled={isDeleting}
                            className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:border-indigo-500/40 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(template.id)}
                            disabled={isDeleting}
                            className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:border-rose-500/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{template.title}</h3>
                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              colorClasses.bgIcon,
                              colorClasses.textIcon
                            )}
                          >
                            {getKindLabel(template.kind)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2">{template.summary}</p>
                      </div>
                    </div>
                  </ContentBlock>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent className="max-w-xl">
          <ModalHeader>
            <ModalTitle>{editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон'}</ModalTitle>
            <ModalDescription>
              {editingTemplate
                ? 'Измените данные шаблона. Все пользователи увидят обновлённую версию при создании проектов.'
                : 'Создайте новый шаблон проекта, который будет доступен всем пользователям.'}
            </ModalDescription>
            <ModalClose />
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="template-title" className="text-sm font-medium text-neutral-200">
                Название
              </label>
              <input
                id="template-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Digital-продукт"
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
                placeholder="Краткое описание шаблона"
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
              onClick={() => {
                setIsModalOpen(false);
                setEditingTemplate(null);
                setFormData({ title: '', kind: 'product', summary: '', projectType: '', projectStage: '', projectVisibility: '' });
              }}
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
              {submitting ? 'Сохранение...' : editingTemplate ? 'Сохранить' : 'Создать'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

