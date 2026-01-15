'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { TIMEZONES } from '@/lib/timezones';
import { fetchVacancyAttachments, uploadVacancyAttachment, type VacancyAttachment } from '@/lib/performers/vacancy-attachments';
import { toast } from '@/lib/ui/toast';
import type { Vacancy, VacancyReward } from '@/lib/schemas/marketplace-vacancy';

type VacancyStatus = 'draft' | 'published' | 'closed';

type VacancyEditorProps = {
  vacancy: Vacancy;
  status: VacancyStatus;
  canEdit: boolean;
};

type RewardType = VacancyReward['type'];

type VacancyEditorState = {
  title: string;
  summary: string;
  description: string;
  level: Vacancy['level'];
  employment: Vacancy['employment'];
  format: Vacancy['format'];
  rewardType: RewardType;
  rewardCurrency: string;
  rewardPeriod: 'hour' | 'day' | 'project';
  rewardMin: number;
  rewardMax: number;
  salaryAmount: number;
  equityShare: string;
  language: string;
  timezone: string;
  deadline: string;
  tags: string;
  requirements: string;
  responsibilities: string;
  testTask: string;
  paymentNote: string;
  contactName: string;
  contactChannel: string;
  status: VacancyStatus;
};

const FORMAT_LABEL: Record<'remote' | 'office' | 'hybrid', string> = {
  remote: 'Удаленно',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

function splitByLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function getRewardDefaults(reward: VacancyReward) {
  if (reward.type === 'salary') {
    return {
      rewardType: 'salary' as const,
      rewardCurrency: reward.currency,
      rewardPeriod: 'hour' as const,
      rewardMin: 0,
      rewardMax: 0,
      salaryAmount: reward.amount,
      equityShare: ''
    };
  }
  if (reward.type === 'equity') {
    return {
      rewardType: 'equity' as const,
      rewardCurrency: 'USD',
      rewardPeriod: 'hour' as const,
      rewardMin: 0,
      rewardMax: 0,
      salaryAmount: 0,
      equityShare: reward.share
    };
  }
  return {
    rewardType: 'rate' as const,
    rewardCurrency: reward.currency,
    rewardPeriod: reward.period,
    rewardMin: reward.min,
    rewardMax: reward.max,
    salaryAmount: 0,
    equityShare: ''
  };
}

export function VacancyEditor({ vacancy, status, canEdit }: VacancyEditorProps) {
  const router = useRouter();
  const rewardDefaults = useMemo(() => getRewardDefaults(vacancy.reward), [vacancy.reward]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<VacancyAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [form, setForm] = useState<VacancyEditorState>({
    title: vacancy.title,
    summary: vacancy.summary,
    description: '',
    level: vacancy.level,
    employment: vacancy.employment,
    format: vacancy.format,
    rewardType: rewardDefaults.rewardType,
    rewardCurrency: rewardDefaults.rewardCurrency,
    rewardPeriod: rewardDefaults.rewardPeriod,
    rewardMin: rewardDefaults.rewardMin,
    rewardMax: rewardDefaults.rewardMax,
    salaryAmount: rewardDefaults.salaryAmount,
    equityShare: rewardDefaults.equityShare,
    language: vacancy.language,
    timezone: vacancy.timezone,
    deadline: toDateInput(vacancy.deadline),
    tags: vacancy.tags.join(', '),
    requirements: vacancy.requirements.join('\n'),
    responsibilities: vacancy.responsibilities.join('\n'),
    testTask: vacancy.testTask,
    paymentNote: vacancy.paymentNote,
    contactName: vacancy.contact.name,
    contactChannel: vacancy.contact.channel,
    status
  });

  const updateField = <K extends keyof VacancyEditorState>(key: K, value: VacancyEditorState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAttachments(true);

    void (async () => {
      try {
        const items = await fetchVacancyAttachments(vacancy.id);
        if (isMounted) {
          setAttachments(items);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAttachments(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [vacancy.id]);

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }

    event.target.value = '';

    for (const file of files) {
      try {
        const attachment = await uploadVacancyAttachment(vacancy.id, file);
        setAttachments((prev) => [attachment, ...prev]);
        toast('Вложение добавлено', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить вложение';
        toast(message, 'warning');
      }
    }
  };

  const toggleFormat = (value: Vacancy['format'][number]) => {
    setForm((prev) => {
      const next = prev.format.includes(value)
        ? prev.format.filter((format) => format !== value)
        : [...prev.format, value];
      return { ...prev, format: next.length ? next : prev.format };
    });
  };

  const buildReward = (): VacancyReward => {
    if (form.rewardType === 'salary') {
      return {
        type: 'salary',
        currency: form.rewardCurrency,
        amount: Math.max(0, Math.round(form.salaryAmount))
      };
    }

    if (form.rewardType === 'equity') {
      return {
        type: 'equity',
        share: form.equityShare.trim()
      };
    }

    return {
      type: 'rate',
      currency: form.rewardCurrency,
      period: form.rewardPeriod,
      min: Math.max(0, Math.round(form.rewardMin)),
      max: Math.max(0, Math.round(form.rewardMax))
    };
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      toast('Заполните название и описание', 'warning');
      return;
    }

    if (!form.deadline) {
      toast('Укажите дедлайн', 'warning');
      return;
    }

    const requirements = splitByLines(form.requirements);
    const responsibilities = splitByLines(form.responsibilities);

    if (requirements.length === 0 || responsibilities.length === 0) {
      toast('Заполните требования и задачи', 'warning');
      return;
    }

    if (!form.contactName.trim() || !form.contactChannel.trim()) {
      toast('Заполните контактные данные', 'warning');
      return;
    }

    const reward = buildReward();
    if (reward.type === 'rate' && reward.max < reward.min) {
      toast('Максимальная ставка должна быть не меньше минимальной', 'warning');
      return;
    }

    const tags = splitByLines(form.tags);

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      level: form.level,
      employment: form.employment,
      format: form.format,
      reward,
      language: form.language.trim() || 'ru',
      timezone: form.timezone.trim() || 'UTC',
      deadline: new Date(form.deadline).toISOString(),
      ...(tags.length > 0 ? { tags } : {}),
      requirements,
      responsibilities,
      testTask: form.testTask.trim(),
      paymentNote: form.paymentNote.trim(),
      contact: {
        name: form.contactName.trim(),
        channel: form.contactChannel.trim()
      }
    };

    setIsSaving(true);

    try {
      const patchResponse = await fetch(`/api/vacancies/${vacancy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!patchResponse.ok) {
        const data = await patchResponse.json().catch(() => null);
        const message = data?.error ?? 'Не удалось обновить вакансию';
        throw new Error(message);
      }

      if (form.status !== status) {
        const statusResponse = await fetch(`/api/vacancies/${vacancy.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: form.status })
        });

        if (!statusResponse.ok) {
          const data = await statusResponse.json().catch(() => null);
          const message = data?.error ?? 'Не удалось обновить статус';
          throw new Error(message);
        }
      }

      toast('Вакансия обновлена', 'success');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка обновления вакансии';
      toast(message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <ContentBlock as="section" size="sm">
        <p className="text-sm text-neutral-400">
          Редактирование доступно только владельцам и администраторам организации.
        </p>
      </ContentBlock>
    );
  }

  return (
    <ContentBlock
      as="section"
      header={
        <ContentBlockTitle
          as="h2"
          actions={
            <Button type="button" variant="secondary" onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? 'Скрыть' : 'Редактировать'}
            </Button>
          }
        >
          Редактирование вакансии
        </ContentBlockTitle>
      }
    >
      {!isEditing ? (
        <p className="text-sm text-neutral-400">Откройте режим редактирования, чтобы обновить вакансию.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Название вакансии</label>
              <Input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Краткое описание</label>
              <Input value={form.summary} onChange={(event) => updateField('summary', event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Описание (опционально)</label>
            <Textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Уровень</label>
              <select
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
                value={form.level}
                onChange={(event) => updateField('level', event.target.value as Vacancy['level'])}
              >
                <option value="Junior">Junior</option>
                <option value="Middle">Middle</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Тип занятости</label>
              <select
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
                value={form.employment}
                onChange={(event) => updateField('employment', event.target.value as Vacancy['employment'])}
              >
                <option value="project">Проектная</option>
                <option value="part-time">Part-time</option>
                <option value="full-time">Full-time</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Дедлайн</label>
              <Input type="date" value={form.deadline} onChange={(event) => updateField('deadline', event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Формат работы</label>
            <div className="flex flex-wrap gap-3">
              {(['remote', 'office', 'hybrid'] as const).map((format) => (
                <label key={format} className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={form.format.includes(format)}
                    onChange={() => toggleFormat(format)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  {FORMAT_LABEL[format]}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-neutral-200">Вознаграждение</h4>
              <select
                className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
                value={form.rewardType}
                onChange={(event) => updateField('rewardType', event.target.value as RewardType)}
              >
                <option value="rate">Почасовая ставка</option>
                <option value="salary">Оклад</option>
                <option value="equity">Доля</option>
              </select>
            </div>

            {form.rewardType === 'rate' ? (
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  value={form.rewardCurrency}
                  onChange={(event) => updateField('rewardCurrency', event.target.value.toUpperCase())}
                  placeholder="USD"
                />
                <select
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
                  value={form.rewardPeriod}
                  onChange={(event) => updateField('rewardPeriod', event.target.value as VacancyEditorState['rewardPeriod'])}
                >
                  <option value="hour">в час</option>
                  <option value="day">в день</option>
                  <option value="project">за проект</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  value={form.rewardMin}
                  onChange={(event) => updateField('rewardMin', Number(event.target.value))}
                  placeholder="Мин"
                />
                <Input
                  type="number"
                  min="0"
                  value={form.rewardMax}
                  onChange={(event) => updateField('rewardMax', Number(event.target.value))}
                  placeholder="Макс"
                />
              </div>
            ) : null}

            {form.rewardType === 'salary' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={form.rewardCurrency}
                  onChange={(event) => updateField('rewardCurrency', event.target.value.toUpperCase())}
                  placeholder="USD"
                />
                <Input
                  type="number"
                  min="0"
                  value={form.salaryAmount}
                  onChange={(event) => updateField('salaryAmount', Number(event.target.value))}
                  placeholder="Сумма"
                />
              </div>
            ) : null}

            {form.rewardType === 'equity' ? (
              <Input
                value={form.equityShare}
                onChange={(event) => updateField('equityShare', event.target.value)}
                placeholder="Например 0.5%"
              />
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Теги (через запятую)</label>
              <Input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Язык</label>
              <Input value={form.language} onChange={(event) => updateField('language', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Часовой пояс</label>
              <Input
                list="vacancy-editor-timezones"
                value={form.timezone}
                onChange={(event) => updateField('timezone', event.target.value)}
              />
              <datalist id="vacancy-editor-timezones">
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Требования (по строкам)</label>
              <Textarea
                value={form.requirements}
                onChange={(event) => updateField('requirements', event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Задачи (по строкам)</label>
              <Textarea
                value={form.responsibilities}
                onChange={(event) => updateField('responsibilities', event.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Тестовое задание</label>
              <Textarea
                value={form.testTask}
                onChange={(event) => updateField('testTask', event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Примечание по оплате</label>
              <Textarea
                value={form.paymentNote}
                onChange={(event) => updateField('paymentNote', event.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Контактное лицо</label>
              <Input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Контакт (email/telegram)</label>
              <Input value={form.contactChannel} onChange={(event) => updateField('contactChannel', event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Вложения</label>
            <input
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
            />
            {isLoadingAttachments ? (
              <p className="text-xs text-neutral-500">Загрузка вложений...</p>
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
              <p className="text-xs text-neutral-500">Добавьте файлы, чтобы прикрепить к вакансии.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value as VacancyStatus)}
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовано</option>
              <option value="closed">Закрыто</option>
            </select>
            <Button type="button" loading={isSaving} disabled={isSaving} onClick={handleSave}>
              Сохранить изменения
            </Button>
          </div>
        </div>
      )}
    </ContentBlock>
  );
}
