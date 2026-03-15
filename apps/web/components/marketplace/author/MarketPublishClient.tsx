'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import type { PublishableProjectSource, PublishableTemplateSource } from '@/lib/marketplace/author-publications';

type MarketPublishClientProps = {
  authorHandle: string | null;
  authorProfilePublic: boolean;
  projectSources: PublishableProjectSource[];
  templateSources: PublishableTemplateSource[];
  existingPublicationsCount: number;
};

const STATUS_LABELS = {
  draft: 'Черновик',
  published: 'Опубликовано',
  rejected: 'Отклонено'
} as const;

export default function MarketPublishClient({
  authorHandle,
  authorProfilePublic,
  projectSources,
  templateSources,
  existingPublicationsCount
}: MarketPublishClientProps) {
  const router = useRouter();
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [creatingService, setCreatingService] = useState(false);

  const authorPageReady = Boolean(authorHandle) && authorProfilePublic;

  async function createProjectPublication(projectId: string) {
    try {
      setCreatingProjectId(projectId);
      const response = await fetch(`/api/pm/projects/${projectId}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Не удалось создать публикацию из проекта');
      }

      toast('Черновик PM-публикации создан', 'success');
      router.push('/market/seller');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Не удалось создать публикацию', 'warning');
    } finally {
      setCreatingProjectId(null);
    }
  }

  async function createTemplatePublication(templateId: string) {
    try {
      setCreatingTemplateId(templateId);
      const response = await fetch('/api/marketplace/author-publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'template',
          sourceTemplateId: templateId
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Не удалось создать публикацию шаблона');
      }

      toast('Черновик шаблона создан', 'success');
      router.push('/market/seller');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Не удалось создать публикацию', 'warning');
    } finally {
      setCreatingTemplateId(null);
    }
  }

  async function createServicePublication() {
    if (!serviceTitle.trim()) {
      toast('Введите название услуги', 'warning');
      return;
    }

    try {
      setCreatingService(true);
      const response = await fetch('/api/marketplace/author-publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'service',
          title: serviceTitle.trim(),
          ...(serviceDescription.trim() ? { description: serviceDescription.trim() } : {})
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Не удалось создать услугу');
      }

      toast('Черновик услуги создан', 'success');
      setServiceTitle('');
      setServiceDescription('');
      router.push('/market/seller');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Не удалось создать услугу', 'warning');
    } finally {
      setCreatingService(false);
    }
  }

  return (
    <div className="space-y-6">
      <ContentBlock
        header={
          <ContentBlockTitle
            as="h2"
            description="Публикация живёт отдельным слоем поверх проекта, шаблона или услуги. Для PM-решений author entity определяется проектом: личный owner или команда."
          >
            C3 Publish Flow
          </ContentBlockTitle>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Маршрут автора</p>
            <p className="mt-2 text-lg font-semibold text-neutral-50">
              {authorHandle ? `/p/${authorHandle}` : 'Handle не настроен'}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              {authorPageReady
                ? 'Личные публикации можно выводить на публичную страницу автора.'
                : 'Чтобы личные публикации попадали на публичную страницу автора, нужен handle и публичный performer-profile.'}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Уже в кабинете</p>
            <p className="mt-2 text-lg font-semibold text-neutral-50">{existingPublicationsCount}</p>
            <p className="mt-2 text-sm text-neutral-400">Единый набор публикаций автора: решения, шаблоны и услуги.</p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Настройки автора</p>
            <p className="mt-2 text-sm text-neutral-300">
              Управление `handle` и публичностью профиля остаётся в settings performer.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/settings/performer"
                className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
              >
                Настроить профиль
              </Link>
              <Link
                href="/market/seller"
                className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
              >
                Открыть кабинет
              </Link>
            </div>
          </div>
        </div>
      </ContentBlock>

      <ContentBlock
        header={<ContentBlockTitle as="h2" description="Выберите PM-проект и создайте для него отдельную карточку каталога.">Готовые решения из PM</ContentBlockTitle>}
      >
        {projectSources.length === 0 ? (
          <p className="text-sm text-neutral-400">Нет PM-проектов, где у вас есть publish-rights по C3 contract: owner для personal или owner/admin для team-owned.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projectSources.map((project) => (
              <article key={project.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">PM-проект</p>
                    <h3 className="mt-2 text-base font-semibold text-neutral-50">{project.title}</h3>
                    <p className="mt-2 text-xs text-neutral-500">
                      Автор публикации: {project.authorEntityType === 'organization' ? 'команда' : 'человек'} · {project.authorEntityLabel}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">Ваш уровень управления: {project.managerRoleLabel}</p>
                  </div>
                  {project.listingStatus ? (
                    <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-[11px] text-neutral-300">
                      {STATUS_LABELS[project.listingStatus]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{project.description}</p>
                <p className="mt-3 text-sm text-neutral-500">{project.authorPageHint}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {project.listingId ? (
                    <Button variant="secondary" onClick={() => router.push('/market/seller')}>
                      Управлять публикацией
                    </Button>
                  ) : (
                    <Button
                      variant="trendy"
                      loading={creatingProjectId === project.id}
                      onClick={() => void createProjectPublication(project.id)}
                    >
                      Создать черновик
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </ContentBlock>

      <ContentBlock
        header={<ContentBlockTitle as="h2" description="Существующие пользовательские шаблоны можно превратить в отдельные публикации каталога.">Шаблоны</ContentBlockTitle>}
      >
        {templateSources.length === 0 ? (
          <p className="text-sm text-neutral-400">Сначала сохраните проект как шаблон, затем вернитесь сюда и создайте publication-layer для каталога.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templateSources.map((template) => (
              <article key={template.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">Пользовательский шаблон</p>
                    <h3 className="mt-2 text-base font-semibold text-neutral-50">{template.title}</h3>
                  </div>
                  {template.publicationStatus ? (
                    <span className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-[11px] text-neutral-300">
                      {STATUS_LABELS[template.publicationStatus]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{template.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {template.publicationId ? (
                    <Button variant="secondary" onClick={() => router.push('/market/seller')}>
                      Управлять публикацией
                    </Button>
                  ) : (
                    <Button
                      variant="trendy"
                      loading={creatingTemplateId === template.id}
                      onClick={() => void createTemplatePublication(template.id)}
                    >
                      Создать черновик
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </ContentBlock>

      <ContentBlock
        header={<ContentBlockTitle as="h2" description="Услуга в каталоге пока остаётся publication-layer без привязки к PM visibility.">Услуги</ContentBlockTitle>}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <label className="text-sm font-medium text-neutral-200" htmlFor="service-title">
              Название услуги
            </label>
            <input
              id="service-title"
              value={serviceTitle}
              onChange={(event) => setServiceTitle(event.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
              placeholder="Например, Адаптация launch-системы под ваш продукт"
            />
            <label className="mt-4 block text-sm font-medium text-neutral-200" htmlFor="service-description">
              Краткое описание
            </label>
            <textarea
              id="service-description"
              value={serviceDescription}
              onChange={(event) => setServiceDescription(event.target.value)}
              rows={5}
              maxLength={1200}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Что именно получает клиент, какой scope вы берёте на себя и в чём ценность услуги."
            />
            <div className="mt-5">
              <Button variant="trendy" loading={creatingService} onClick={() => void createServicePublication()}>
                Создать черновик услуги
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
            Услуга создаётся как отдельная публикация каталога.
            <br />
            Она не наследует PM visibility и не меняет публичность performer-profile автоматически.
          </div>
        </div>
      </ContentBlock>
    </div>
  );
}
