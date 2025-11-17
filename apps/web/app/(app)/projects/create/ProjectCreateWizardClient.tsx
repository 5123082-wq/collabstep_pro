'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/telemetry';
import { cn } from '@/lib/utils';

type WizardStep = 'details' | 'visibility' | 'confirm';

type ProjectCreateWizardClientProps = {
  currentUserId: string;
};

export default function ProjectCreateWizardClient({ currentUserId }: ProjectCreateWizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('details');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const canContinue = name.trim().length >= 3;

  const handleNext = () => {
    setTouched(true);
    if (!canContinue) {
      toast('Введите название проекта (не менее 3 символов)', 'warning');
      return;
    }
    setStep('visibility');
  };

  const handleBack = () => {
    setStep((prev) => (prev === 'confirm' ? 'visibility' : 'details'));
  };

  const resetState = useCallback(() => {
    setName('');
    setKey('');
    setDescription('');
    setVisibility('private');
    setStatus('draft');
    setStep('details');
    setSubmitting(false);
    setTouched(false);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!canContinue) {
      toast('Введите название проекта (не менее 3 символов)', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/pm/projects', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          key: key.trim() || undefined,
          visibility,
          status
        })
      });

      if (!response.ok) {
        throw new Error(`Create project failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        project: { id: string; key: string };
      };
      const projectId = payload.project?.id;

      trackEvent('project_created', {
        userId: currentUserId,
        projectId,
        visibility,
        status
      });

      toast('Проект создан', 'success');
      resetState();

      if (projectId) {
        router.replace(`/pm/projects/${projectId}`);
      } else {
        router.replace('/pm/projects');
      }
    } catch (error) {
      console.error(error);
      toast('Не удалось создать проект. Попробуйте позже.', 'warning');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-neutral-900 bg-neutral-950/80 p-8 shadow-xl">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-indigo-300">Мастер создания</p>
        <h1 className="text-xl font-semibold text-white">Новый проект</h1>
        <p className="text-sm text-neutral-400">
          Заполните основные данные, выберите видимость и статус — проект появится в списке и станет
          доступен вашей команде.
        </p>
      </header>

      <form className="space-y-10" onSubmit={handleSubmit}>
        {step === 'details' && (
          <section className="space-y-6">
            <div>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Название проекта
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Например, Релиз новой версии"
                  autoFocus
                  className={cn(
                    'w-full rounded-xl border bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                    touched && !canContinue ? 'border-rose-500/60' : 'border-neutral-900'
                  )}
                />
              </label>
              {touched && !canContinue ? (
                <p className="mt-2 text-xs text-rose-300">Минимум 3 символа.</p>
              ) : null}
            </div>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Ключ проекта
              <input
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Например, REL"
                className="w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                maxLength={10}
              />
              <span className="text-[11px] text-neutral-500">
                Используется в задачах. Оставьте пустым — ключ сгенерируется автоматически.
              </span>
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Краткое описание
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Цели, основные этапы, команда…"
                className="min-h-[120px] w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
          </section>
        )}

        {step === 'visibility' && (
          <section className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
              <h2 className="text-lg font-semibold text-white">Доступ и статус</h2>
              <p className="text-sm text-neutral-400">
                Определите видимость проекта и стартовый статус. Вы сможете изменить их в настройках
                позже.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border px-4 py-4 text-left transition',
                    visibility === 'private'
                      ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-100'
                      : 'border-neutral-900 bg-neutral-950/60 text-neutral-200 hover:border-indigo-500/40 hover:text-white'
                  )}
                >
                  <span className="text-sm font-semibold uppercase tracking-wide">Приватный</span>
                  <span className="text-xs text-neutral-400">
                    Видят только участники и владелец. Идеально для внутренних команд.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border px-4 py-4 text-left transition',
                    visibility === 'public'
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                      : 'border-neutral-900 bg-neutral-950/60 text-neutral-200 hover:border-emerald-500/40 hover:text-white'
                  )}
                >
                  <span className="text-sm font-semibold uppercase tracking-wide">Публичный</span>
                  <span className="text-xs text-neutral-400">
                    Доступен всей организации. Используйте для витрины или кросс-командных инициатив.
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'draft', label: 'Черновик', description: 'Отрабатываем контент и планы.' },
                  { id: 'active', label: 'Активный', description: 'Проект в работе.' }
                ].map(({ id, label, description }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatus(id as typeof status)}
                    className={cn(
                      'flex-1 min-w-[140px] rounded-xl border px-4 py-3 text-left text-sm transition',
                      status === id
                        ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-100'
                        : 'border-neutral-900 bg-neutral-950/60 text-neutral-200 hover:border-indigo-500/40 hover:text-white'
                    )}
                  >
                    <span className="font-semibold uppercase tracking-wide">{label}</span>
                    <span className="mt-1 block text-xs text-neutral-400">{description}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 'confirm' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6 text-sm text-neutral-200">
              <h2 className="text-lg font-semibold text-white">Проверьте данные</h2>
              <ul className="mt-4 space-y-3">
                <li>
                  <span className="text-neutral-500">Название:</span>{' '}
                  <strong className="text-white">{name.trim()}</strong>
                </li>
                <li>
                  <span className="text-neutral-500">Ключ:</span>{' '}
                  <strong className="text-white">{key.trim() || 'Будет сгенерирован'}</strong>
                </li>
                <li>
                  <span className="text-neutral-500">Видимость:</span>{' '}
                  <strong className="text-white">
                    {visibility === 'private' ? 'Приватный' : 'Публичный'}
                  </strong>
                </li>
                <li>
                  <span className="text-neutral-500">Статус:</span>{' '}
                  <strong className="text-white">
                    {status === 'draft' ? 'Черновик' : 'Активный'}
                  </strong>
                </li>
              </ul>
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                step === 'details'
                  ? 'border-indigo-500/60 text-indigo-100'
                  : 'border-neutral-800 text-neutral-400'
              )}
            >
              1
            </span>
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                step === 'visibility'
                  ? 'border-indigo-500/60 text-indigo-100'
                  : 'border-neutral-800 text-neutral-400'
              )}
            >
              2
            </span>
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                step === 'confirm'
                  ? 'border-indigo-500/60 text-indigo-100'
                  : 'border-neutral-800 text-neutral-400'
              )}
            >
              3
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {step !== 'details' ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
              >
                Назад
              </button>
            ) : null}

            {step === 'details' ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25"
              >
                Далее
              </button>
            ) : step === 'visibility' ? (
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/25"
              >
                К подтверждению
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'rounded-xl border border-indigo-500/60 bg-indigo-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/30',
                  submitting ? 'opacity-70' : ''
                )}
              >
                {submitting ? 'Создаём…' : 'Создать проект'}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}

