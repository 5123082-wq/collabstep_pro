'use client';

import { useState, useEffect } from 'react';
import { put } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';

type WorkFormat = 'remote' | 'office' | 'hybrid';

type PerformerProfileFormData = {
  specialization: string;
  skills: string[];
  bio: string;
  rate: number;
  employmentType: string;
  isPublic: boolean;
  languages: string[];
  workFormats: WorkFormat[];
  handle: string;
  portfolioEnabled: boolean;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  fileUrl: string | null;
  projectId: string | null;
  order: number | null;
  createdAt: string | null;
};

type CaseItem = {
  id: string;
  title: string;
  description: string | null;
  outcome: string | null;
  projectId: string | null;
  createdAt: string | null;
};

type MessageState = { type: 'success' | 'error'; text: string } | null;

type PortfolioDraft = {
  title: string;
  description: string;
  url: string;
  file: File | null;
};

type CaseDraft = {
  title: string;
  description: string;
  outcome: string;
};

const WORK_FORMAT_OPTIONS: WorkFormat[] = ['remote', 'office', 'hybrid'];

const WORK_FORMAT_LABEL: Record<WorkFormat, string> = {
  remote: 'Удаленно',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

const EMPLOYMENT_OPTIONS = [
  { value: 'fulltime', label: 'Полная занятость' },
  { value: 'parttime', label: 'Частичная занятость' },
  { value: 'contract', label: 'Проектная работа' }
];

export function PerformerProfileForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const [formData, setFormData] = useState<PerformerProfileFormData>({
    specialization: '',
    skills: [],
    bio: '',
    rate: 0,
    employmentType: 'contract',
    isPublic: false,
    languages: [],
    workFormats: ['remote'],
    handle: '',
    portfolioEnabled: false
  });

  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft>({
    title: '',
    description: '',
    url: '',
    file: null
  });
  const [isPortfolioSaving, setIsPortfolioSaving] = useState(false);

  const [caseItems, setCaseItems] = useState<CaseItem[]>([]);
  const [caseDraft, setCaseDraft] = useState<CaseDraft>({
    title: '',
    description: '',
    outcome: ''
  });
  const [isCaseSaving, setIsCaseSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        const [profileRes, portfolioRes, casesRes] = await Promise.all([
          fetch('/api/me/performer-profile'),
          fetch('/api/me/performer-profile/portfolio'),
          fetch('/api/me/performer-profile/cases')
        ]);

        const profileData = await profileRes.json().catch(() => null);
        const portfolioData = await portfolioRes.json().catch(() => null);
        const casesData = await casesRes.json().catch(() => null);

        if (!isActive) {
          return;
        }

        const profilePayload = profileData?.data?.profile ?? profileData?.profile ?? null;
        if (profilePayload) {
          const workFormats = Array.isArray(profilePayload.workFormats)
            ? profilePayload.workFormats.filter((item: string): item is WorkFormat =>
                WORK_FORMAT_OPTIONS.includes(item as WorkFormat)
              )
            : [];

          setFormData({
            specialization: profilePayload.specialization ?? '',
            skills: Array.isArray(profilePayload.skills) ? profilePayload.skills : [],
            bio: profilePayload.bio ?? '',
            rate: profilePayload.rate ?? 0,
            employmentType: profilePayload.employmentType ?? 'contract',
            isPublic: profilePayload.isPublic ?? false,
            languages: Array.isArray(profilePayload.languages) ? profilePayload.languages : [],
            workFormats: workFormats.length > 0 ? workFormats : ['remote'],
            handle: profilePayload.handle ?? '',
            portfolioEnabled: profilePayload.portfolioEnabled ?? false
          });
        }

        const portfolioPayload = portfolioData?.data?.items ?? portfolioData?.items ?? [];
        setPortfolioItems(Array.isArray(portfolioPayload) ? portfolioPayload : []);

        const casesPayload = casesData?.data?.items ?? casesData?.items ?? [];
        setCaseItems(Array.isArray(casesPayload) ? casesPayload : []);
      } catch (error) {
        console.error(error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const trimmedHandle = formData.handle.trim();

    const payload = {
      specialization: formData.specialization,
      skills: formData.skills,
      bio: formData.bio,
      rate: formData.rate,
      employmentType: formData.employmentType,
      isPublic: formData.isPublic,
      languages: formData.languages,
      workFormats: formData.workFormats,
      portfolioEnabled: formData.portfolioEnabled,
      ...(trimmedHandle ? { handle: trimmedHandle } : {})
    };

    try {
      const res = await fetch('/api/me/performer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save profile');
      }

      setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
      toast('Профиль сохранен', 'success');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Ошибка при сохранении профиля' });
      toast('Ошибка при сохранении профиля', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = (event?: React.KeyboardEvent) => {
    if (event && event.key !== 'Enter') return;
    event?.preventDefault();

    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove)
    }));
  };

  const addLanguage = (event?: React.KeyboardEvent) => {
    if (event && event.key !== 'Enter') return;
    event?.preventDefault();

    const language = languageInput.trim();
    if (language && !formData.languages.includes(language)) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, language] }));
      setLanguageInput('');
    }
  };

  const removeLanguage = (languageToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((language) => language !== languageToRemove)
    }));
  };

  const toggleWorkFormat = (format: WorkFormat) => {
    setFormData((prev) => {
      const nextFormats = prev.workFormats.includes(format)
        ? prev.workFormats.filter((item) => item !== format)
        : [...prev.workFormats, format];
      return { ...prev, workFormats: nextFormats.length > 0 ? nextFormats : prev.workFormats };
    });
  };

  const requestUploadUrl = async (file: File) => {
    const response = await fetch('/api/me/performer-profile/portfolio/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error ?? 'Не удалось получить ссылку загрузки';
      throw new Error(message);
    }

    const data = await response.json().catch(() => null);
    const payload = data?.data ?? data;
    if (!payload?.token || !payload?.pathname) {
      throw new Error('Некорректный ответ загрузки');
    }

    return { token: payload.token as string, pathname: payload.pathname as string };
  };

  const uploadPortfolioFile = async (file: File) => {
    const { token, pathname } = await requestUploadUrl(file);
    const result = await put(pathname, file, {
      token,
      contentType: file.type || 'application/octet-stream',
      access: 'public'
    });
    return result.url;
  };

  const handleAddPortfolioItem = async () => {
    const title = portfolioDraft.title.trim();
    if (!title) {
      toast('Введите название работы', 'warning');
      return;
    }

    setIsPortfolioSaving(true);

    try {
      let fileUrl: string | undefined;
      if (portfolioDraft.file) {
        fileUrl = await uploadPortfolioFile(portfolioDraft.file);
      }

      const description = portfolioDraft.description.trim();
      const url = portfolioDraft.url.trim();

      const payload = {
        title,
        ...(description ? { description } : {}),
        ...(url ? { url } : {}),
        ...(fileUrl ? { fileUrl } : {})
      };

      const response = await fetch('/api/me/performer-profile/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить портфолио');
      }

      const data = await response.json().catch(() => null);
      const item = data?.data?.item ?? data?.item;
      if (item) {
        setPortfolioItems((prev) => [item, ...prev]);
      }

      setPortfolioDraft({ title: '', description: '', url: '', file: null });
      toast('Работа добавлена', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки портфолио';
      toast(message, 'warning');
    } finally {
      setIsPortfolioSaving(false);
    }
  };

  const handleDeletePortfolioItem = async (id: string) => {
    try {
      const response = await fetch(`/api/me/performer-profile/portfolio?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Не удалось удалить работу');
      }
      setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
      toast('Работа удалена', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления';
      toast(message, 'warning');
    }
  };

  const handleAddCaseItem = async () => {
    const title = caseDraft.title.trim();
    if (!title) {
      toast('Введите название кейса', 'warning');
      return;
    }

    setIsCaseSaving(true);

    try {
      const description = caseDraft.description.trim();
      const outcome = caseDraft.outcome.trim();

      const payload = {
        title,
        ...(description ? { description } : {}),
        ...(outcome ? { outcome } : {})
      };

      const response = await fetch('/api/me/performer-profile/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить кейс');
      }

      const data = await response.json().catch(() => null);
      const item = data?.data?.item ?? data?.item;
      if (item) {
        setCaseItems((prev) => [item, ...prev]);
      }

      setCaseDraft({ title: '', description: '', outcome: '' });
      toast('Кейс добавлен', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка сохранения кейса';
      toast(message, 'warning');
    } finally {
      setIsCaseSaving(false);
    }
  };

  const handleDeleteCaseItem = async (id: string) => {
    try {
      const response = await fetch(`/api/me/performer-profile/cases?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Не удалось удалить кейс');
      }
      setCaseItems((prev) => prev.filter((item) => item.id !== id));
      toast('Кейс удален', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления';
      toast(message, 'warning');
    }
  };

  if (isLoading) return <div>Загрузка профиля...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-10 max-w-3xl">
      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Основная информация</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Handle</label>
          <Input
            value={formData.handle}
            onChange={(event) => setFormData({ ...formData, handle: event.target.value })}
            placeholder="username"
          />
          <p className="text-xs text-[color:var(--text-tertiary)]">Используется в публичной ссылке /p/handle.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Специализация</label>
          <Input
            value={formData.specialization}
            onChange={(event) => setFormData({ ...formData, specialization: event.target.value })}
            placeholder="Например: Frontend Developer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Навыки</label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={addSkill}
              placeholder="Введите навык и нажмите Enter"
            />
            <Button type="button" onClick={() => addSkill()} variant="secondary">
              Добавить
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill) => (
              <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-indigo-900">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Языки</label>
          <div className="flex gap-2">
            <Input
              value={languageInput}
              onChange={(event) => setLanguageInput(event.target.value)}
              onKeyDown={addLanguage}
              placeholder="Например: RU, EN"
            />
            <Button type="button" onClick={() => addLanguage()} variant="secondary">
              Добавить
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.languages.map((language) => (
              <span key={language} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                {language}
                <button type="button" onClick={() => removeLanguage(language)} className="hover:text-emerald-900">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">О себе</label>
          <Textarea
            value={formData.bio}
            onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
            placeholder="Расскажите о своем опыте и проектах..."
            rows={5}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Условия работы</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--text-secondary)]">Ставка ($/ч)</label>
            <Input
              type="number"
              min="0"
              value={formData.rate}
              onChange={(event) => setFormData({ ...formData, rate: parseFloat(event.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--text-secondary)]">Тип занятости</label>
            <select
              className="flex h-10 w-full rounded-md border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-base)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.employmentType}
              onChange={(event) => setFormData({ ...formData, employmentType: event.target.value })}
            >
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Форматы работы</label>
          <div className="flex flex-wrap gap-3">
            {WORK_FORMAT_OPTIONS.map((format) => (
              <label key={format} className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={formData.workFormats.includes(format)}
                  onChange={() => toggleWorkFormat(format)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {WORK_FORMAT_LABEL[format]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(event) => setFormData({ ...formData, isPublic: event.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="isPublic" className="font-medium text-[color:var(--text-primary)]">Публичный профиль</label>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Ваш профиль будет виден в каталоге исполнителей, и вас смогут приглашать в проекты.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="portfolioEnabled"
              checked={formData.portfolioEnabled}
              onChange={(event) => setFormData({ ...formData, portfolioEnabled: event.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="portfolioEnabled" className="font-medium text-[color:var(--text-primary)]">Портфолио публично</label>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Визитка будет показывать добавленные работы и кейсы.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Портфолио</h3>

        <div className="space-y-4">
          {portfolioItems.length === 0 ? (
            <p className="text-sm text-[color:var(--text-tertiary)]">Работы пока не добавлены.</p>
          ) : (
            <div className="space-y-3">
              {portfolioItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{item.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-indigo-500">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer">
                            Ссылка на проект
                          </a>
                        ) : null}
                        {item.fileUrl ? (
                          <a href={item.fileUrl} target="_blank" rel="noreferrer">
                            Файл
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => handleDeletePortfolioItem(item.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-[color:var(--surface-border-strong)] bg-[color:var(--surface-base)] p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">Название работы</label>
                <Input
                  value={portfolioDraft.title}
                  onChange={(event) => setPortfolioDraft({ ...portfolioDraft, title: event.target.value })}
                  placeholder="Проект или задача"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">Ссылка</label>
                <Input
                  value={portfolioDraft.url}
                  onChange={(event) => setPortfolioDraft({ ...portfolioDraft, url: event.target.value })}
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--text-secondary)]">Описание</label>
              <Textarea
                value={portfolioDraft.description}
                onChange={(event) => setPortfolioDraft({ ...portfolioDraft, description: event.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--text-secondary)]">Файл (Vercel Blob)</label>
              <Input
                type="file"
                onChange={(event) => {
                  const selectedFile = event.target.files?.item(0) ?? null;
                  setPortfolioDraft({
                    ...portfolioDraft,
                    file: selectedFile
                  });
                }}
              />
              {portfolioDraft.file ? (
                <p className="text-xs text-[color:var(--text-tertiary)]">Выбран файл: {portfolioDraft.file.name}</p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddPortfolioItem} loading={isPortfolioSaving}>
                Добавить работу
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Кейсы</h3>

        <div className="space-y-4">
          {caseItems.length === 0 ? (
            <p className="text-sm text-[color:var(--text-tertiary)]">Кейсы пока не добавлены.</p>
          ) : (
            <div className="space-y-3">
              {caseItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{item.description}</p>
                      ) : null}
                      {item.outcome ? (
                        <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">Результат: {item.outcome}</p>
                      ) : null}
                    </div>
                    <Button type="button" variant="secondary" onClick={() => handleDeleteCaseItem(item.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-[color:var(--surface-border-strong)] bg-[color:var(--surface-base)] p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">Название кейса</label>
                <Input
                  value={caseDraft.title}
                  onChange={(event) => setCaseDraft({ ...caseDraft, title: event.target.value })}
                  placeholder="Результат проекта"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">Результат</label>
                <Input
                  value={caseDraft.outcome}
                  onChange={(event) => setCaseDraft({ ...caseDraft, outcome: event.target.value })}
                  placeholder="Что было достигнуто"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--text-secondary)]">Описание</label>
              <Textarea
                value={caseDraft.description}
                onChange={(event) => setCaseDraft({ ...caseDraft, description: event.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddCaseItem} loading={isCaseSaving}>
                Добавить кейс
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
        </Button>
      </div>
    </form>
  );
}
