'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from '@/lib/ui/toast';

type CatalogApplyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceKind: 'template' | 'solution';
  sourceId: string;
  sourceTitle: string;
};

type OrganizationOption = {
  id: string;
  name: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type TargetMode = 'new_project' | 'existing_project';

export default function CatalogApplyModal({
  open,
  onOpenChange,
  sourceKind,
  sourceId,
  sourceTitle
}: CatalogApplyModalProps) {
  const router = useRouter();
  const [targetMode, setTargetMode] = useState<TargetMode>('new_project');
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectTitle, setProjectTitle] = useState(sourceTitle);
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setTargetMode('new_project');
      setProjectId('');
      setProjectTitle(sourceTitle);
      setProjectDescription('');
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      fetch('/api/organizations', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/pm/projects?scope=all&pageSize=100', { cache: 'no-store' }).then((response) => response.json())
    ])
      .then(([organizationsPayload, projectsPayload]) => {
        if (!active) {
          return;
        }

        const nextOrganizations = Array.isArray(organizationsPayload?.data?.organizations)
          ? organizationsPayload.data.organizations
              .filter((item: unknown): item is OrganizationOption => {
                return (
                  typeof item === 'object' &&
                  item !== null &&
                  typeof (item as { id?: unknown }).id === 'string' &&
                  typeof (item as { name?: unknown }).name === 'string'
                );
              })
              .map((item: OrganizationOption) => ({ id: item.id, name: item.name }))
          : [];

        const nextProjects = Array.isArray(projectsPayload?.items)
          ? projectsPayload.items
              .filter((item: unknown): item is { id: string; name: string; permissions?: { canCreateTask?: boolean } } => {
                return (
                  typeof item === 'object' &&
                  item !== null &&
                  typeof (item as { id?: unknown }).id === 'string' &&
                  typeof (item as { name?: unknown }).name === 'string'
                );
              })
              .filter((item: { id: string; name: string; permissions?: { canCreateTask?: boolean } }) => item.permissions?.canCreateTask !== false)
              .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))
          : [];

        setOrganizations(nextOrganizations);
        setProjects(nextProjects);
        setOrganizationId((current) => current || nextOrganizations[0]?.id || '');
      })
      .catch((error) => {
        console.error('[CatalogApplyModal] failed to load options', error);
        if (active) {
          toast('Не удалось загрузить проекты и организации', 'warning');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, sourceTitle]);

  const existingProjectsAvailable = projects.length > 0;
  const submitLabel = targetMode === 'new_project' ? 'Создать проект и импортировать' : 'Импортировать в проект';
  const intro = useMemo(() => {
    if (sourceKind === 'template') {
      return 'Шаблон переносится в PM как рабочая структура: новый проект или отдельный import-блок в существующем проекте.';
    }
    return 'Готовое решение переносится в PM как reusable starting point, не смешиваясь с публичной публикацией каталога.';
  }, [sourceKind]);

  async function handleSubmit() {
    if (targetMode === 'new_project' && organizationId.trim().length === 0) {
      toast('Выберите организацию для нового проекта', 'warning');
      return;
    }

    if (targetMode === 'existing_project' && projectId.trim().length === 0) {
      toast('Выберите проект, в который нужно импортировать решение', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const body =
        targetMode === 'new_project'
          ? {
              sourceKind,
              sourceId,
              targetMode,
              organizationId,
              ...(projectTitle.trim() ? { projectTitle: projectTitle.trim() } : {}),
              ...(projectDescription.trim() ? { projectDescription: projectDescription.trim() } : {})
            }
          : {
              sourceKind,
              sourceId,
              targetMode,
              projectId
            };

      const response = await fetch('/api/marketplace/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { project?: { id: string }; importedTaskCount?: number }; error?: string }
        | null;

      if (!response.ok || !payload?.data?.project?.id) {
        throw new Error(payload?.error ?? 'Не удалось применить решение в проект');
      }

      toast(
        targetMode === 'new_project'
          ? `Проект создан, импортировано задач: ${payload.data.importedTaskCount ?? 0}`
          : `Решение импортировано в проект, задач: ${payload.data.importedTaskCount ?? 0}`,
        'success'
      );
      onOpenChange(false);
      router.push(`/pm/projects/${payload.data.project.id}`);
      router.refresh();
    } catch (error) {
      console.error('[CatalogApplyModal] apply failed', error);
      toast(error instanceof Error ? error.message : 'Не удалось применить решение', 'warning');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>Использовать в проекте</ModalTitle>
          <ModalDescription>{intro}</ModalDescription>
          <ModalClose />
        </ModalHeader>

        <ModalBody className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Источник</p>
            <p className="mt-2 text-base font-semibold text-neutral-100">{sourceTitle}</p>
            <p className="mt-2 text-sm text-neutral-400">
              В PM попадёт отдельный рабочий блок задач. Public publication каталога и PM-проект останутся разными слоями.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setTargetMode('new_project')}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                targetMode === 'new_project'
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
              }`}
            >
              <p className="text-sm font-semibold text-neutral-100">Новый PM-проект</p>
              <p className="mt-2 text-sm text-neutral-400">
                Рекомендуемый путь из каталога: создаём новый проект и сразу переносим reusable-структуру.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('existing_project')}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                targetMode === 'existing_project'
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
              }`}
            >
              <p className="text-sm font-semibold text-neutral-100">Существующий проект</p>
              <p className="mt-2 text-sm text-neutral-400">
                Используйте этот путь, если у вас уже есть рабочий контур и в него нужно добавить отдельный import-блок.
              </p>
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-8 text-sm text-neutral-400">
              Загружаем доступные проекты и организации…
            </div>
          ) : null}

          {!loading && targetMode === 'new_project' ? (
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-neutral-200">Организация</span>
                <select
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Выберите организацию</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-neutral-200">Название проекта</span>
                <input
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
                  placeholder={sourceTitle}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-neutral-200">Описание проекта</span>
                <textarea
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  rows={4}
                  className="resize-none rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="Опционально: уточните, под какой контекст переносится решение."
                />
              </label>
            </div>
          ) : null}

          {!loading && targetMode === 'existing_project' ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-neutral-200">Проект для импорта</span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                disabled={!existingProjectsAvailable}
              >
                <option value="">
                  {existingProjectsAvailable ? 'Выберите проект' : 'Нет доступных проектов с правом на импорт'}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-neutral-500">
                В проект будет добавлен отдельный блок задач с пометкой источника из каталога.
              </p>
            </label>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || loading}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Применяем…' : submitLabel}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
