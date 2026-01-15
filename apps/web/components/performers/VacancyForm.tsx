'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TIMEZONES } from '@/lib/timezones';
import { uploadVacancyAttachment } from '@/lib/performers/vacancy-attachments';
import { toast } from '@/lib/ui/toast';
import type { VacancyReward } from '@/lib/schemas/marketplace-vacancy';

type VacancyFormProps = {
  organizationId: string | null;
  onCreated?: (vacancyId?: string) => void;
};

type RewardType = VacancyReward['type'];

type VacancyFormState = {
  title: string;
  summary: string;
  description: string;
  level: 'Junior' | 'Middle' | 'Senior';
  employment: 'project' | 'part-time' | 'full-time';
  format: Array<'remote' | 'office' | 'hybrid'>;
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
  status: 'draft' | 'published';
};

const DEFAULT_STATE: VacancyFormState = {
  title: '',
  summary: '',
  description: '',
  level: 'Middle',
  employment: 'project',
  format: ['remote'],
  rewardType: 'rate',
  rewardCurrency: 'USD',
  rewardPeriod: 'hour',
  rewardMin: 0,
  rewardMax: 0,
  salaryAmount: 0,
  equityShare: '',
  language: 'ru',
  timezone: 'UTC',
  deadline: '',
  tags: '',
  requirements: '',
  responsibilities: '',
  testTask: '',
  paymentNote: '',
  contactName: '',
  contactChannel: '',
  status: 'draft'
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

export function VacancyForm({ organizationId, onCreated }: VacancyFormProps) {
  const [form, setForm] = useState<VacancyFormState>(DEFAULT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isTimezoneTouched, setIsTimezoneTouched] = useState(false);

  const updateField = <K extends keyof VacancyFormState>(key: K, value: VacancyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'timezone') {
      setIsTimezoneTouched(true);
    }
  };

  const toggleFormat = (value: 'remote' | 'office' | 'hybrid') => {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organizationId) {
      toast('Выберите организацию', 'warning');
      return;
    }

    if (!form.title.trim() || !form.summary.trim()) {
      toast('Заполните название и описание вакансии', 'warning');
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

    const reward = buildReward();
    if (reward.type === 'rate' && reward.max < reward.min) {
      toast('Максимальная ставка должна быть не меньше минимальной', 'warning');
      return;
    }

    const deadlineIso = new Date(form.deadline).toISOString();
    const tags = splitByLines(form.tags);

    const payload = {
      organizationId,
      title: form.title.trim(),
      summary: form.summary.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      level: form.level,
      employment: form.employment,
      format: form.format,
      reward,
      language: form.language.trim() || 'ru',
      timezone: form.timezone.trim() || 'UTC',
      deadline: deadlineIso,
      ...(tags.length ? { tags } : {}),
      requirements,
      responsibilities,
      testTask: form.testTask.trim(),
      paymentNote: form.paymentNote.trim(),
      contact: {
        name: form.contactName.trim(),
        channel: form.contactChannel.trim()
      },
      status: form.status
    };

    if (!payload.contact.name || !payload.contact.channel) {
      toast('Заполните контактные данные', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => null);
        const message = responseData?.error ?? 'Не удалось создать вакансию';
        throw new Error(message);
      }

      const responseData = await response.json().catch(() => null);
      const responsePayload = responseData?.data ?? responseData;
      const createdVacancyId = responsePayload?.vacancy?.id;

      if (createdVacancyId && pendingAttachments.length > 0) {
        let hasFailures = false;
        for (const file of pendingAttachments) {
          try {
            await uploadVacancyAttachment(createdVacancyId, file);
          } catch (error) {
            hasFailures = true;
          }
        }
        if (hasFailures) {
          toast('Некоторые вложения не удалось загрузить. Добавьте их в карточке вакансии.', 'warning');
        }
      }

      setForm(DEFAULT_STATE);
      setPendingAttachments([]);
      setIsTimezoneTouched(false);
      toast('Вакансия создана', 'success');
      onCreated?.(createdVacancyId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка создания вакансии';
      toast(message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isTimezoneTouched) {
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const response = await fetch('/api/me/profile');
        if (!response.ok) {
          return;
        }
        const data = await response.json().catch(() => null);
        const profile = data?.data?.profile ?? data?.profile;
        const timezone = typeof profile?.timezone === 'string' ? profile.timezone : null;
        if (!timezone || !isMounted) {
          return;
        }
        setForm((prev) => ({
          ...prev,
          timezone: prev.timezone === DEFAULT_STATE.timezone ? timezone : prev.timezone
        }));
      } catch (error) {
        // Ignore timezone fetch errors for form defaults.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isTimezoneTouched]);

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }
    setPendingAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <label className="text-sm font-medium text-neutral-300">Подробное описание</label>
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
            onChange={(event) => updateField('level', event.target.value as VacancyFormState['level'])}
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
            onChange={(event) => updateField('employment', event.target.value as VacancyFormState['employment'])}
          >
            <option value="project">Проектная</option>
            <option value="part-time">Part-time</option>
            <option value="full-time">Full-time</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-300">Дедлайн</label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(event) => updateField('deadline', event.target.value)}
          />
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
              onChange={(event) => updateField('rewardPeriod', event.target.value as VacancyFormState['rewardPeriod'])}
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
          <div className="grid gap-3 md:grid-cols-3">
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
            list="vacancy-timezones"
            value={form.timezone}
            onChange={(event) => updateField('timezone', event.target.value)}
          />
          <datalist id="vacancy-timezones">
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
        {pendingAttachments.length > 0 ? (
          <ul className="space-y-2 text-sm text-neutral-300">
            {pendingAttachments.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(index)}
                  className="text-xs text-neutral-400 transition hover:text-rose-300"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-500">Файлы загрузятся после создания вакансии.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100"
          value={form.status}
          onChange={(event) => updateField('status', event.target.value as VacancyFormState['status'])}
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликовать</option>
        </select>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting || !organizationId}>
          Создать вакансию
        </Button>
      </div>
    </form>
  );
}
