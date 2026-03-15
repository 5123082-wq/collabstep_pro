'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import type {
  ManagedAuthorPublication,
  ManagedAuthorPublicationKind,
  ManagedAuthorPublicationStatus
} from '@/lib/marketplace/author-publications';

type MarketSellerClientProps = {
  authorHandle: string | null;
  authorProfilePublic: boolean;
  items: ManagedAuthorPublication[];
};

type PublicationEditorState = {
  title: string;
  description: string;
  tags: string;
  state: ManagedAuthorPublicationStatus;
  showOnAuthorPage: boolean;
  sortOrder: number;
  saving: boolean;
};

const STATUS_OPTIONS: Array<{ value: ManagedAuthorPublicationStatus; label: string }> = [
  { value: 'draft', label: 'Черновик' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'rejected', label: 'Отклонено' }
];

function kindToApi(kind: ManagedAuthorPublicationKind): 'solution' | 'template' | 'service' {
  if (kind === 'solution') {
    return 'solution';
  }
  return kind;
}

function buildState(items: ManagedAuthorPublication[]): Record<string, PublicationEditorState> {
  return items.reduce<Record<string, PublicationEditorState>>((acc, item) => {
    acc[item.id] = {
      title: item.title,
      description: item.description,
      tags: item.tags.join(', '),
      state: item.status,
      showOnAuthorPage: item.showOnAuthorPage,
      sortOrder: item.sortOrder,
      saving: false
    };
    return acc;
  }, {});
}

export default function MarketSellerClient({
  authorHandle,
  authorProfilePublic,
  items
}: MarketSellerClientProps) {
  const router = useRouter();
  const [editorState, setEditorState] = useState<Record<string, PublicationEditorState>>(() => buildState(items));

  useEffect(() => {
    setEditorState(buildState(items));
  }, [items]);

  const authorPageReady = Boolean(authorHandle) && authorProfilePublic;

  function updateDraft(id: string, patch: Partial<PublicationEditorState>) {
    setEditorState((current) => {
      const entry = current[id];
      if (!entry) {
        return current;
      }
      return {
        ...current,
        [id]: {
          ...entry,
          ...patch
        }
      };
    });
  }

  async function savePublication(item: ManagedAuthorPublication) {
    const draft = editorState[item.id];
    if (!draft) {
      return;
    }

    if (!draft.title.trim()) {
      toast('Название публикации не может быть пустым', 'warning');
      return;
    }

    try {
      updateDraft(item.id, { saving: true });

      const tags = draft.tags
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const response = await fetch(`/api/marketplace/author-publications/${kindToApi(item.kind)}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          state: draft.state,
          showOnAuthorPage: draft.showOnAuthorPage,
          sortOrder: draft.sortOrder,
          ...(item.kind !== 'solution' ? { tags } : {})
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Не удалось обновить публикацию');
      }

      toast('Публикация обновлена', 'success');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Не удалось обновить публикацию', 'warning');
    } finally {
      updateDraft(item.id, { saving: false });
    }
  }

  return (
    <div className="space-y-6">
      <ContentBlock
        header={
          <ContentBlockTitle
            as="h2"
            description="Visibility на странице автора живёт отдельно от PM visibility и отдельно от общей публичности performer-profile. Для team-owned PM публикаций действует временное правило C3: они не выводятся на `/p/:handle` человека."
          >
            Кабинет автора
          </ContentBlockTitle>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Публикаций в кабинете</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-50">{items.length}</p>
            <p className="mt-2 text-sm text-neutral-400">Здесь сведены PM listings, шаблоны и услуги.</p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Публичная страница автора</p>
            <p className="mt-2 text-lg font-semibold text-neutral-50">
              {authorHandle ? `/p/${authorHandle}` : 'Handle не настроен'}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              {authorPageReady
                ? 'Личные публикации при `published + showOnAuthorPage` могут попасть на public author-page.'
                : 'Сначала настройте handle и включите публичность performer-profile для личных публикаций.'}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Быстрые переходы</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/market/publish"
                className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
              >
                Создать публикацию
              </Link>
              <Link
                href="/settings/performer"
                className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
              >
                Настроить профиль
              </Link>
            </div>
          </div>
        </div>
      </ContentBlock>

      {!authorPageReady ? (
        <ContentBlock variant="dashed">
          <p className="text-sm text-neutral-300">
            Publication-layer уже работает, но `/p/:handle` пока недоступен для вывода этих объектов.
            Настройте `handle` и включите публичность performer-profile в <Link href="/settings/performer" className="text-indigo-300 hover:text-indigo-200">settings performer</Link>.
          </p>
        </ContentBlock>
      ) : null}

      {items.length === 0 ? (
        <ContentBlock variant="dashed">
          <p className="text-sm text-neutral-400">Публикаций пока нет. Начните с `/market/publish`, затем вернитесь сюда для управления статусом и авторской видимостью.</p>
        </ContentBlock>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const draft = editorState[item.id];
            if (!draft) {
              return null;
            }

            return (
              <ContentBlock
                key={item.id}
                header={
                  <ContentBlockTitle
                    as="h2"
                    description={`${item.sourceLabel} · ${item.sourceMeta}`}
                    actions={
                      <Link
                        href={item.href}
                        className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:text-neutral-50"
                      >
                        Открыть раздел
                      </Link>
                    }
                  >
                    {item.title}
                  </ContentBlockTitle>
                }
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4 text-sm text-neutral-300">
                      <p className="font-medium text-neutral-100">Автор публикации: {item.authorEntityLabel}</p>
                      <p className="mt-2 text-neutral-500">{item.authorPageHint}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-200" htmlFor={`${item.id}-title`}>
                        Название публикации
                      </label>
                      <input
                        id={`${item.id}-title`}
                        value={draft.title}
                        onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                        className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
                        maxLength={255}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-200" htmlFor={`${item.id}-description`}>
                        Описание
                      </label>
                      <textarea
                        id={`${item.id}-description`}
                        value={draft.description}
                        onChange={(event) => updateDraft(item.id, { description: event.target.value })}
                        rows={5}
                        className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none resize-none"
                        maxLength={2000}
                      />
                    </div>

                    {item.kind !== 'solution' ? (
                      <div>
                        <label className="text-sm font-medium text-neutral-200" htmlFor={`${item.id}-tags`}>
                          Теги
                        </label>
                        <input
                          id={`${item.id}-tags`}
                          value={draft.tags}
                          onChange={(event) => updateDraft(item.id, { tags: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-indigo-500 focus:outline-none"
                          placeholder="launch, branding, audit"
                        />
                        <p className="mt-2 text-xs text-neutral-500">Введите теги через запятую.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-200" htmlFor={`${item.id}-state`}>
                        Статус публикации
                      </label>
                      <select
                        id={`${item.id}-state`}
                        value={draft.state}
                        onChange={(event) =>
                          updateDraft(item.id, { state: event.target.value as ManagedAuthorPublicationStatus })
                        }
                        className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-200" htmlFor={`${item.id}-sort-order`}>
                        Порядок на странице автора
                      </label>
                      <input
                        id={`${item.id}-sort-order`}
                        type="number"
                        min={0}
                        max={999}
                        value={draft.sortOrder}
                        onChange={(event) => updateDraft(item.id, { sortOrder: Number(event.target.value) || 0 })}
                        className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-100 transition focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
                      <input
                        type="checkbox"
                        checked={draft.showOnAuthorPage}
                        onChange={(event) => updateDraft(item.id, { showOnAuthorPage: event.target.checked })}
                        disabled={!item.supportsAuthorPage}
                        className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-indigo-400"
                      />
                      <span>
                        Показывать на странице автора
                        <span className="mt-1 block text-xs text-neutral-500">
                          {item.supportsAuthorPage
                            ? 'Этот переключатель не меняет PM visibility и не делает performer-profile публичным автоматически.'
                            : 'Для team-owned PM публикации этот переключатель временно не действует: отдельный team public route ещё не внедрён.'}
                        </span>
                      </span>
                    </label>

                    <Button variant="trendy" loading={draft.saving} onClick={() => void savePublication(item)}>
                      Сохранить изменения
                    </Button>
                  </div>
                </div>
              </ContentBlock>
            );
          })}
        </div>
      )}
    </div>
  );
}
