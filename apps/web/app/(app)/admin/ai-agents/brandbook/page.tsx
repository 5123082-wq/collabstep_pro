'use client';

import { useEffect, useState } from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import {
    Sparkles,
    Save,
    History,
    CircleCheck,
    ChevronLeft,
    Plus,
    Rocket,
    Loader2,
    Clock
} from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';

interface PromptVersion {
    id: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    systemPrompt: string | null;
    prompts: {
        intake?: string;
        logoCheck?: string;
        generate?: string;
        qa?: string;
        followup?: string;
    } | null;
    createdAt: string;
}

export default function BrandbookAgentAdminPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
    const [isModified, setIsModified] = useState(false);

    // Fetch data
    const fetchData = async () => {
        try {
            const resp = await fetch('/api/admin/ai-agents/brandbook');
            const data = await resp.json();

            if (data.error) throw new Error(data.error.details || data.error.code);

            setVersions(data.promptVersions);

            // Select published version by default, or the latest version
            const published = data.promptVersions.find((v: PromptVersion) => v.status === 'published');
            setSelectedVersion(published || data.promptVersions[0] || null);
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Ошибка загрузки данных', 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const handleFieldChange = (field: string, value: string) => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;

        setIsModified(true);
        setSelectedVersion(prev => {
            if (!prev) return null;
            if (field === 'systemPrompt') {
                return { ...prev, systemPrompt: value };
            }
            return {
                ...prev,
                prompts: {
                    ...prev.prompts,
                    [field]: value
                }
            };
        });
    };

    const handleSave = async () => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;

        setSaving(true);
        try {
            const resp = await fetch(`/api/admin/ai-agents/brandbook/prompts/${selectedVersion.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: selectedVersion.systemPrompt,
                    prompts: selectedVersion.prompts
                })
            });

            if (!resp.ok) throw new Error('Failed to save');

            setIsModified(false);
            toast('Версия сохранена', 'success');
            await fetchData();
        } catch (err) {
            toast('Ошибка при сохранении', 'warning');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateDraft = async () => {
        setLoading(true);
        try {
            // Create new draft based on currently selected version
            const resp = await fetch('/api/admin/ai-agents/brandbook/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: selectedVersion?.systemPrompt,
                    prompts: selectedVersion?.prompts
                })
            });

            if (!resp.ok) throw new Error('Failed to create draft');

            const newDraft = await resp.json();
            toast('Новый черновик (v' + newDraft.version + ') создан', 'success');
            await fetchData();
            setSelectedVersion(newDraft);
        } catch (err) {
            toast('Ошибка создания черновика', 'warning');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;

        if (!confirm('Вы уверены, что хотите опубликовать эту версию? Она станет активной для всех пользователей.')) {
            return;
        }

        setPublishing(true);
        try {
            const resp = await fetch(`/api/admin/ai-agents/brandbook/prompts/${selectedVersion.id}/publish`, {
                method: 'POST'
            });

            if (!resp.ok) throw new Error('Failed to publish');

            toast('Версия v' + selectedVersion.version + ' опубликована!', 'success');
            await fetchData();
        } catch (err) {
            toast('Ошибка публикации', 'warning');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/ai-agents"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/50 text-neutral-400 transition hover:bg-neutral-800"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <AdminPageHeader
                    title="Настройка Brandbook Agent"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Sidebar: Versions List */}
                <div className="lg:col-span-1 space-y-4">
                    <ContentBlock title="Версии промптов" size="sm">
                        <div className="space-y-2">
                            <button
                                onClick={handleCreateDraft}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
                            >
                                <Plus className="h-4 w-4" />
                                Новый черновик
                            </button>

                            <div className="mt-4 space-y-1">
                                {versions.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            if (isModified && !confirm('Несохраненные изменения будут потеряны. Продолжить?')) return;
                                            setSelectedVersion(v);
                                            setIsModified(false);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${selectedVersion?.id === v.id
                                            ? 'bg-neutral-800 text-white ring-1 ring-neutral-700'
                                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <History className="h-3.5 w-3.5" />
                                            <span>v{v.version}</span>
                                        </div>
                                        {v.status === 'published' && (
                                            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] uppercase text-green-400">
                                                Active
                                            </span>
                                        )}
                                        {v.status === 'draft' && (
                                            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] uppercase text-yellow-400">
                                                Draft
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </ContentBlock>
                </div>

                {/* Main: Prompt Editor */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedVersion ? (
                        <>
                            {/* Version Header */}
                            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedVersion.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {selectedVersion.status === 'published' ? <CircleCheck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Версия {selectedVersion.version}</h3>
                                        <p className="text-xs text-neutral-500">
                                            Создана {new Date(selectedVersion.createdAt).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {selectedVersion.status === 'draft' && (
                                        <>
                                            <button
                                                onClick={handleSave}
                                                disabled={!isModified || saving}
                                                className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                Сохранить
                                            </button>
                                            <button
                                                onClick={handlePublish}
                                                disabled={publishing}
                                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                                            >
                                                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                                                Опубликовать
                                            </button>
                                        </>
                                    )}
                                    {selectedVersion.status === 'published' && (
                                        <div className="flex items-center gap-2 text-sm text-green-400">
                                            <CircleCheck className="h-4 w-4" />
                                            Эта версия используется на сайте
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Editor Fields */}
                            <div className="space-y-6">
                                {/* System Prompt */}
                                <ContentBlock title="Системный промпт" size="sm">
                                    <p className="mb-3 text-xs text-neutral-500">
                                        Глобальные инструкции по стилю общения, ограничениям и базовым знаниям агента.
                                    </p>
                                    <textarea
                                        value={selectedVersion.systemPrompt || ''}
                                        onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
                                        disabled={selectedVersion.status !== 'draft'}
                                        className="h-32 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                        placeholder="Напр.: Вы — экспертный AI-дизайнер брендбуков..."
                                    />
                                </ContentBlock>

                                {/* Stages */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-6">
                                        <ContentBlock title="Этап: Приветствие (Intake)" size="sm">
                                            <textarea
                                                value={selectedVersion.prompts?.intake || ''}
                                                onChange={(e) => handleFieldChange('intake', e.target.value)}
                                                disabled={selectedVersion.status !== 'draft'}
                                                className="h-24 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                            />
                                        </ContentBlock>

                                        <ContentBlock title="Этап: Проверка логотипа" size="sm">
                                            <textarea
                                                value={selectedVersion.prompts?.logoCheck || ''}
                                                onChange={(e) => handleFieldChange('logoCheck', e.target.value)}
                                                disabled={selectedVersion.status !== 'draft'}
                                                className="h-24 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                            />
                                        </ContentBlock>
                                    </div>

                                    <div className="space-y-6">
                                        <ContentBlock title="Этап: Генерация брендбука" size="sm">
                                            <p className="mb-2 text-[10px] text-indigo-400">
                                                Используйте {'{{productBundle}}'}, {'{{preferences}}'} для вставки данных.
                                            </p>
                                            <textarea
                                                value={selectedVersion.prompts?.generate || ''}
                                                onChange={(e) => handleFieldChange('generate', e.target.value)}
                                                disabled={selectedVersion.status !== 'draft'}
                                                className="h-24 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                            />
                                        </ContentBlock>

                                        <ContentBlock title="Этап: Проверка качества (QA)" size="sm">
                                            <textarea
                                                value={selectedVersion.prompts?.qa || ''}
                                                onChange={(e) => handleFieldChange('qa', e.target.value)}
                                                disabled={selectedVersion.status !== 'draft'}
                                                className="h-24 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                            />
                                        </ContentBlock>
                                    </div>
                                </div>

                                <ContentBlock title="Этап: Завершение (Followup)" size="sm">
                                    <textarea
                                        value={selectedVersion.prompts?.followup || ''}
                                        onChange={(e) => handleFieldChange('followup', e.target.value)}
                                        disabled={selectedVersion.status !== 'draft'}
                                        className="h-24 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                    />
                                </ContentBlock>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-[400px] flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20">
                            <Sparkles className="h-10 w-10 text-neutral-700" />
                            <div className="text-center">
                                <p className="text-neutral-400">Версии не найдены</p>
                                <button
                                    onClick={handleCreateDraft}
                                    className="mt-4 text-sm text-indigo-400 hover:underline"
                                >
                                    Создать первый черновик
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
