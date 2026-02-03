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
    Clock,
    Trash2,
    MessageSquare,
    Zap
} from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';

// --- Types ---

type StepKey = 'intake' | 'logoCheck' | 'generate' | 'qa' | 'followup';

interface PromptBlock {
    id: string;
    order: number;
    name: string;
    content: string;
    stepKey?: StepKey;
}

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
    blocks: PromptBlock[] | null;
    createdAt: string;
}

// --- Constants ---

const STEP_KEY_OPTIONS: Array<{ value: StepKey; label: string }> = [
    { value: 'intake', label: 'intake' },
    { value: 'logoCheck', label: 'logoCheck' },
    { value: 'generate', label: 'generate' },
    { value: 'qa', label: 'qa' },
    { value: 'followup', label: 'followup' }
];

/**
 * Info about how each step is used:
 * - intake/followup: shown as message to user (no LLM call)
 * - logoCheck/qa: added to system prompt (LLM call)
 * - generate: used as user prompt (LLM call)
 */
const STEP_INFO: Record<StepKey, { badge: string; badgeColor: string; description: string; isLLM: boolean }> = {
    intake: {
        badge: 'сообщение',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        description: 'Показывается пользователю как приветственное сообщение',
        isLLM: false
    },
    logoCheck: {
        badge: 'LLM + system',
        badgeColor: 'bg-purple-500/20 text-purple-400',
        description: 'Добавляется к системному промпту при проверке логотипа',
        isLLM: true
    },
    generate: {
        badge: 'LLM + user',
        badgeColor: 'bg-orange-500/20 text-orange-400',
        description: 'Используется как user prompt для генерации. Поддерживает {{productBundle}}, {{preferences}}',
        isLLM: true
    },
    qa: {
        badge: 'LLM + system',
        badgeColor: 'bg-purple-500/20 text-purple-400',
        description: 'Добавляется к системному промпту при проверке качества',
        isLLM: true
    },
    followup: {
        badge: 'сообщение',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        description: 'Показывается пользователю после завершения генерации',
        isLLM: false
    }
};

/**
 * Convert legacy prompts object to blocks array
 */
function legacyPromptsToBlocks(prompts: PromptVersion['prompts']): PromptBlock[] {
    if (!prompts) return [];

    const blocks: PromptBlock[] = [];
    const keys: StepKey[] = ['intake', 'logoCheck', 'generate', 'qa', 'followup'];

    keys.forEach((key, index) => {
        const content = prompts[key];
        if (content) {
            blocks.push({
                id: crypto.randomUUID(),
                order: index + 1,
                name: key,
                content,
                stepKey: key
            });
        }
    });

    return blocks;
}

/**
 * Get blocks from version (use blocks if available, else convert from prompts)
 */
function getVersionBlocks(version: PromptVersion): PromptBlock[] {
    if (version.blocks && version.blocks.length > 0) {
        return [...version.blocks].sort((a, b) => a.order - b.order);
    }
    return legacyPromptsToBlocks(version.prompts);
}

export default function BrandbookAgentAdminPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
    const [blocks, setBlocks] = useState<PromptBlock[]>([]);
    const [systemPrompt, setSystemPrompt] = useState('');
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
            const selected = published || data.promptVersions[0] || null;
            setSelectedVersion(selected);

            if (selected) {
                setBlocks(getVersionBlocks(selected));
                setSystemPrompt(selected.systemPrompt || '');
            }
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Ошибка загрузки данных', 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    // When selected version changes, update local state
    const handleSelectVersion = (v: PromptVersion) => {
        if (isModified && !confirm('Несохраненные изменения будут потеряны. Продолжить?')) return;
        setSelectedVersion(v);
        setBlocks(getVersionBlocks(v));
        setSystemPrompt(v.systemPrompt || '');
        setIsModified(false);
    };

    const handleSystemPromptChange = (value: string) => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;
        setSystemPrompt(value);
        setIsModified(true);
    };

    const handleBlockChange = (blockId: string, field: 'name' | 'content' | 'stepKey', value: string) => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;
        setBlocks(prev => prev.map(b =>
            b.id === blockId
                ? { ...b, [field]: field === 'stepKey' ? (value as StepKey || undefined) : value }
                : b
        ));
        setIsModified(true);
    };

    const handleAddBlock = () => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;
        const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order)) : 0;
        const newBlock: PromptBlock = {
            id: crypto.randomUUID(),
            order: maxOrder + 1,
            name: '',
            content: ''
        };
        setBlocks(prev => [...prev, newBlock]);
        setIsModified(true);
    };

    const handleDeleteBlock = (blockId: string) => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;
        if (!confirm('Удалить этот блок?')) return;
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        setIsModified(true);
    };

    const handleSave = async () => {
        if (!selectedVersion || selectedVersion.status !== 'draft') return;

        setSaving(true);
        try {
            // Normalize blocks order
            const normalizedBlocks = blocks.map((b, idx) => ({
                ...b,
                order: idx + 1
            }));

            const resp = await fetch(`/api/admin/ai-agents/brandbook/prompts/${selectedVersion.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt,
                    blocks: normalizedBlocks
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
            const normalizedBlocks = blocks.map((b, idx) => ({
                ...b,
                order: idx + 1
            }));

            const resp = await fetch('/api/admin/ai-agents/brandbook/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt,
                    blocks: normalizedBlocks
                })
            });

            if (!resp.ok) throw new Error('Failed to create draft');

            const newDraft = await resp.json();
            toast('Новый черновик (v' + newDraft.version + ') создан', 'success');
            await fetchData();
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
                                        onClick={() => handleSelectVersion(v)}
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

                {/* Main: Prompt Editor - Single Column */}
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

                            {/* Editor Fields - Single Column */}
                            <div className="space-y-6">
                                {/* System Prompt */}
                                <ContentBlock title="Системный промпт" size="sm">
                                    <p className="mb-3 text-xs text-neutral-500">
                                        Глобальные инструкции по стилю общения, ограничениям и базовым знаниям агента.
                                    </p>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => handleSystemPromptChange(e.target.value)}
                                        disabled={selectedVersion.status !== 'draft'}
                                        className="h-32 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                        placeholder="Напр.: Вы — экспертный AI-дизайнер брендбуков..."
                                    />
                                </ContentBlock>

                                {/* Blocks - Sequential */}
                                {blocks.map((block, index) => {
                                    const stepInfo = block.stepKey ? STEP_INFO[block.stepKey] : null;
                                    return (
                                        <ContentBlock
                                            key={block.id}
                                            title={`Блок ${index + 1}${block.stepKey ? ` (${block.stepKey})` : ''}`}
                                            size="sm"
                                        >
                                            {/* Badge */}
                                            {stepInfo && (
                                                <div className="mb-3 flex items-center gap-2">
                                                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${stepInfo.badgeColor}`}>
                                                        {stepInfo.isLLM ? <Zap className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                                                        {stepInfo.badge}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                {/* Block name / stepKey selector */}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <label className="mb-1 block text-xs text-neutral-500">Имя (stepKey)</label>
                                                        <select
                                                            value={block.stepKey || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value as StepKey | '';
                                                                handleBlockChange(block.id, 'stepKey', val);
                                                                if (val) {
                                                                    handleBlockChange(block.id, 'name', val);
                                                                }
                                                            }}
                                                            disabled={selectedVersion.status !== 'draft'}
                                                            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                                        >
                                                            <option value="">— выберите —</option>
                                                            {STEP_KEY_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {selectedVersion.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleDeleteBlock(block.id)}
                                                            className="mt-5 flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                                                            title="Удалить блок"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                {stepInfo && (
                                                    <p className="text-xs text-neutral-500">{stepInfo.description}</p>
                                                )}

                                                {/* Content */}
                                                <textarea
                                                    value={block.content}
                                                    onChange={(e) => handleBlockChange(block.id, 'content', e.target.value)}
                                                    disabled={selectedVersion.status !== 'draft'}
                                                    className="h-32 w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200 outline-none focus:border-indigo-500/50 disabled:opacity-60"
                                                    placeholder="Содержимое блока..."
                                                />
                                            </div>
                                        </ContentBlock>
                                    );
                                })}

                                {/* Add Block Button */}
                                {selectedVersion.status === 'draft' && (
                                    <button
                                        onClick={handleAddBlock}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/30 py-4 text-sm text-neutral-400 transition hover:border-indigo-500/50 hover:text-indigo-400"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Добавить блок
                                    </button>
                                )}
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
