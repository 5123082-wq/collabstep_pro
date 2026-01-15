'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';
import { fetchVacancyAttachments, type VacancyAttachment } from '@/lib/performers/vacancy-attachments';
import { toast } from '@/lib/ui/toast';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { ResponseForm } from '@/components/performers/ResponseForm';

const EMPLOYMENT_LABEL: Record<'project' | 'part-time' | 'full-time', string> = {
  project: 'Проектная занятость',
  'part-time': 'Частичная занятость',
  'full-time': 'Полная занятость'
};

const FORMAT_LABEL: Record<'remote' | 'office' | 'hybrid', string> = {
  remote: 'Удалённо',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

function formatReward(reward: Vacancy['reward']): string {
  if (reward.type === 'rate') {
    const min = reward.min.toLocaleString('ru-RU');
    const max = reward.max.toLocaleString('ru-RU');
    const period = reward.period === 'hour' ? 'час' : reward.period === 'day' ? 'день' : 'проект';
    const currency = reward.currency === 'RUB' ? '₽' : reward.currency;
    if (reward.min === reward.max) {
      return `${min} ${currency}/${period}`;
    }
    return `${min} – ${max} ${currency}/${period}`;
  }
  if (reward.type === 'salary') {
    const amount = reward.amount.toLocaleString('ru-RU');
    const currency = reward.currency === 'RUB' ? '₽' : reward.currency;
    return `${amount} ${currency}/мес.`;
  }
  return `Доля ${reward.share}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

type VacancyDetailProps = {
  vacancy: Vacancy;
};

export default function VacancyDetail({ vacancy }: VacancyDetailProps) {
  const [isRespondOpen, setRespondOpen] = useState(false);
  const [attachments, setAttachments] = useState<VacancyAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const detailSections = useMemo(
    () => [
      { id: 'requirements', title: 'Требования', items: vacancy.requirements },
      { id: 'responsibilities', title: 'Задачи', items: vacancy.responsibilities }
    ],
    [vacancy.requirements, vacancy.responsibilities]
  );

  useEffect(() => {
    if (!isRespondOpen) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setRespondOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isRespondOpen]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAttachments(true);

    void (async () => {
      const items = await fetchVacancyAttachments(vacancy.id);
      if (isMounted) {
        setAttachments(items);
        setIsLoadingAttachments(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [vacancy.id]);

  useEffect(() => {
    if (!isRespondOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const firstInput = dialogRef.current?.querySelector('input, textarea, select, button') as HTMLElement | null;
    firstInput?.focus();

    const dialogNode = dialogRef.current;
    if (!dialogNode) {
      return;
    }

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(
        dialogNode.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('aria-hidden'));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !dialogNode.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialogNode.addEventListener('keydown', handleTab);
    return () => dialogNode.removeEventListener('keydown', handleTab);
  }, [isRespondOpen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/performers/vacancies"
            className="inline-flex items-center gap-2 text-sm text-indigo-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            ← Назад в каталог
          </Link>
          <p className="mt-4 text-xs uppercase tracking-wide text-indigo-300">{vacancy.project}</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-50">{vacancy.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
          <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">{vacancy.level}</span>
          <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">{EMPLOYMENT_LABEL[vacancy.employment]}</span>
          {vacancy.format.map((format) => (
            <span key={format} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
              {FORMAT_LABEL[format]}
            </span>
          ))}
          <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">Язык: {vacancy.language.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <ContentBlock
            as="section"
            header={<ContentBlockTitle>Описание</ContentBlockTitle>}
          >
            <p className="text-sm text-neutral-300">{vacancy.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
              {vacancy.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </ContentBlock>

          {detailSections.map((section) => (
            <ContentBlock
              key={section.id}
              as="section"
              header={<ContentBlockTitle>{section.title}</ContentBlockTitle>}
            >
              <ul className="space-y-2 text-sm text-neutral-300">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-1 block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ContentBlock>
          ))}

          <ContentBlock
            as="section"
            header={<ContentBlockTitle>Тестовое задание</ContentBlockTitle>}
          >
            <p className="text-sm text-neutral-300">{vacancy.testTask}</p>
          </ContentBlock>

          <ContentBlock
            as="section"
            header={<ContentBlockTitle>Вложения</ContentBlockTitle>}
          >
            {isLoadingAttachments ? (
              <p className="text-sm text-neutral-400">Загрузка вложений...</p>
            ) : attachments.length > 0 ? (
              <ul className="space-y-2 text-sm text-neutral-300">
                {attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center justify-between gap-3">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-indigo-200 transition hover:text-white"
                    >
                      {attachment.filename}
                    </a>
                    <span className="text-xs text-neutral-500">
                      {(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Нет вложений.</p>
            )}
          </ContentBlock>
        </div>

        <aside className="space-y-4">
          <ContentBlock as="section" size="sm" header={<ContentBlockTitle as="h2">Условия</ContentBlockTitle>}>
            <dl className="space-y-2 text-sm text-neutral-300">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Вознаграждение</dt>
                <dd className="text-right text-neutral-100">{formatReward(vacancy.reward)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Дедлайн</dt>
                <dd className="text-right">{formatDate(vacancy.deadline)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Часовой пояс</dt>
                <dd className="text-right">{vacancy.timezone}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Публикация</dt>
                <dd className="text-right">{formatDate(vacancy.createdAt)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-500">{vacancy.paymentNote}</p>
          </ContentBlock>

          <ContentBlock as="section" size="sm" className="space-y-3" header={<ContentBlockTitle as="h2">Контакты</ContentBlockTitle>}>
            <p className="text-sm text-neutral-300">{vacancy.contact.name}</p>
            <p className="text-sm text-neutral-400">{vacancy.contact.channel}</p>
            <button
              type="button"
              onClick={() => toast('Чат откроется позже (mock)')}
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Открыть чат
            </button>
          </ContentBlock>

          <ContentBlock as="section" size="sm" className="space-y-3">
            <button
              type="button"
              onClick={() => setRespondOpen(true)}
              className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Откликнуться
            </button>
            <button
              type="button"
              onClick={() => toast('Вакансия сохранена (mock)')}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Сохранить вакансию
            </button>
            <button
              type="button"
              onClick={() => toast('Подписка оформлена (mock)')}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Подписаться на обновления
            </button>
          </ContentBlock>
        </aside>
      </div>

      {isRespondOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Отклик на вакансию"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur"
        >
          <ContentBlock className="w-full max-w-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Отклик на вакансию</h2>
                <p className="text-sm text-neutral-400">Расскажите о себе и оставьте контакты — команда свяжется с вами.</p>
              </div>
              <button
                type="button"
                onClick={() => setRespondOpen(false)}
                className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-sm text-neutral-300 transition hover:border-rose-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                aria-label="Закрыть форму"
              >
                Esc
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <ResponseForm vacancyId={vacancy.id} onSuccess={() => setRespondOpen(false)} />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setRespondOpen(false)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-indigo-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  Отмена
                </button>
              </div>
            </div>
          </ContentBlock>
        </div>
      )}
    </div>
  );
}
