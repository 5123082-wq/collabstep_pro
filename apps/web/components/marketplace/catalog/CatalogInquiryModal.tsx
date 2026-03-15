'use client';

import { useEffect, useState } from 'react';
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
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { CatalogSourceKind } from '@/lib/marketplace/types';
import { toast } from '@/lib/ui/toast';

type CatalogInquiryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceKind: CatalogSourceKind;
  sourceId: string;
  sourceTitle: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

export default function CatalogInquiryModal({
  open,
  onOpenChange,
  sourceKind,
  sourceId,
  sourceTitle
}: CatalogInquiryModalProps) {
  const router = useRouter();
  const submitInquiry = useMarketplaceStore((state) => state.submitInquiry);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [brief, setBrief] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState('');

  useEffect(() => {
    if (!open) {
      setBrief('');
      setDesiredOutcome('');
      setLinkedProjectId('');
      return;
    }

    let active = true;
    setLoadingProjects(true);

    fetch('/api/pm/projects?scope=all&pageSize=100', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) {
          return;
        }

        const nextProjects = Array.isArray(payload?.items)
          ? payload.items
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
        setProjects(nextProjects);
      })
      .catch((error) => {
        console.error('[CatalogInquiryModal] failed to load projects', error);
      })
      .finally(() => {
        if (active) {
          setLoadingProjects(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  function handleSubmit() {
    if (brief.trim().length < 12) {
      toast('Коротко опишите задачу и контекст адаптации', 'warning');
      return;
    }

    if (desiredOutcome.trim().length < 3) {
      toast('Укажите ожидаемый результат или формат работы', 'warning');
      return;
    }

    const linkedProject = projects.find((item) => item.id === linkedProjectId) ?? null;

    submitInquiry({
      sourceKind,
      sourceId,
      sourceTitle,
      brief: brief.trim(),
      desiredOutcome: desiredOutcome.trim(),
      ...(linkedProject ? { linkedProjectId: linkedProject.id, linkedProjectTitle: linkedProject.name } : {})
    });

    toast('Бриф сохранён в разделе сделок и доступа', 'success');
    onOpenChange(false);
    router.push('/market/orders');
  }

  const scopeLabel =
    sourceKind === 'service'
      ? 'Услуга уходит в inquiry-first path: сначала brief и контекст, затем согласование scope и только потом проект/сделка.'
      : 'Адаптация решения начинается с brief, чтобы reuse-flow не проваливался в shop-first checkout.';

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>Запросить адаптацию</ModalTitle>
          <ModalDescription>{scopeLabel}</ModalDescription>
          <ModalClose />
        </ModalHeader>

        <ModalBody className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Источник</p>
            <p className="mt-2 text-base font-semibold text-neutral-100">{sourceTitle}</p>
            <p className="mt-2 text-sm text-neutral-400">
              После отправки brief появится в `Сделки и доступ` как secondary deal-layer. Checkout и access остаются следующими этапами.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-neutral-200">Что нужно адаптировать</span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={5}
              className="resize-none rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Опишите продукт, ограничения, сроки, что уже есть и что должно измениться."
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-neutral-200">Ожидаемый результат</span>
            <input
              value={desiredOutcome}
              onChange={(event) => setDesiredOutcome(event.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Например: адаптация под текущий продуктовый спринт или запуск нового проекта."
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-neutral-200">Связать с проектом (опционально)</span>
            <select
              value={linkedProjectId}
              onChange={(event) => setLinkedProjectId(event.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">
                {loadingProjects ? 'Загружаем проекты…' : 'Пока без привязки к проекту'}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-neutral-500">
              Если проект уже существует, inquiry сразу попадёт в контекст работы. Иначе проект можно создать после согласования.
            </p>
          </label>
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
            onClick={handleSubmit}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Отправить brief
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
