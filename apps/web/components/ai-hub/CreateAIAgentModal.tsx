'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalTitle,
    ModalDescription
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/ui/toast';
import type { AIAgentType } from '@collabverse/api';

type CreateAIAgentModalProps = {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
};

type AIAgentScope = 'personal' | 'team' | 'public';

type AgentFormData = {
    name: string;
    email: string;
    title: string;
    agentType: AIAgentType;
    scope: AIAgentScope;
    apiKey: string;
    responseTemplates: string;
    autoRespond: boolean;
    responseStyle: 'short' | 'detailed';
    modelProvider: 'subscription' | 'openai_api_key';
};

const INITIAL_DATA: AgentFormData = {
    name: '',
    email: '',
    title: '',
    agentType: 'assistant',
    scope: 'personal',
    apiKey: '',
    responseTemplates: '',
    autoRespond: true,
    responseStyle: 'short',
    modelProvider: 'subscription'
};

const AGENT_TYPES: { value: AIAgentType; label: string; description: string }[] = [
    { value: 'assistant', label: 'Ассистент', description: 'Автоматически отвечает на вопросы и помогает с задачами' },
    { value: 'reviewer', label: 'Ревьюер', description: 'Проверяет задачи и оставляет комментарии' },
    { value: 'reminder', label: 'Напоминание', description: 'Напоминает о предстоящих дедлайнах' },
    { value: 'summarizer', label: 'Саммаризатор', description: 'Подводит итоги обсуждений и комментариев' }
];

const SCOPES: { value: AIAgentScope; label: string; description: string }[] = [
    { value: 'personal', label: 'Личное использование', description: 'Доступно только вам' },
    { value: 'team', label: 'Команда', description: 'Доступно участникам вашей команды' },
    { value: 'public', label: 'Общедоступный', description: 'Доступно всем пользователям платформы' }
];

export default function CreateAIAgentModal({ open, onClose, onSuccess }: CreateAIAgentModalProps) {
    // Force refresh
    const [formData, setFormData] = useState<AgentFormData>(INITIAL_DATA);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setFormData(INITIAL_DATA);
        }
    }, [open]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        // Auto-generate email from name (kept for internal logic if needed, but unused in UI now)
        const email = name
            .toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + '@collabverse.ai';

        setFormData(prev => ({
            ...prev,
            name,
            email: prev.email === '' || prev.email.endsWith('@collabverse.ai') ? email : prev.email
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast('Имя агента обязательно', 'warning');
            return;
        }

        // Email validation removed from UI requirement
        
        // Check API key only if user selected 'openai_api_key' provider
        if (formData.modelProvider === 'openai_api_key' && !formData.apiKey) {
            toast('API Ключ обязателен при выборе своего ключа', 'warning');
            return;
        }

        setLoading(true);

        try {
            const templates = formData.responseTemplates
                .split('\n')
                .map(t => t.trim())
                .filter(Boolean);

            const response = await fetch('/api/pm/ai-agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    // email: formData.email, // Let backend generate it
                    title: formData.title,
                    agentType: formData.agentType,
                    scope: formData.scope,
                    apiKey: formData.apiKey,
                    responseTemplates: templates.length > 0 ? templates : undefined,
                    behavior: {
                        autoRespond: formData.autoRespond,
                        responseStyle: formData.responseStyle
                    },
                    modelProvider: formData.modelProvider
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || errorData.message || 'Не удалось создать агента';
                
                throw new Error(errorMessage);
            }

            toast('AI Агент успешно создан', 'success');
            router.refresh();
            onSuccess?.();
            onClose();
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Не удалось создать агента', 'warning');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onOpenChange={onClose}>
            <ModalContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <ModalHeader>
                        <ModalTitle>Создание AI-агента</ModalTitle>
                        <ModalDescription>
                            Создайте нового цифрового сотрудника для автоматизации рабочих процессов.
                        </ModalDescription>
                    </ModalHeader>

                    <ModalBody className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Имя агента <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="Например: Support Bot"
                                required
                                className="bg-neutral-900 border-neutral-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Должность / Роль
                            </label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Например: Автоматизированный помощник"
                                className="bg-neutral-900 border-neutral-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">
                                    Тип агента <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.agentType}
                                    onChange={e => setFormData(prev => ({ ...prev, agentType: e.target.value as AIAgentType }))}
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                                >
                                    {AGENT_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">
                                    Доступ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.scope}
                                    onChange={e => setFormData(prev => ({ ...prev, scope: e.target.value as AIAgentScope }))}
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                                >
                                    {SCOPES.map(scope => (
                                        <option key={scope.value} value={scope.value}>
                                            {scope.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Scope description help text */}
                        <div className="text-xs text-neutral-500 -mt-2">
                             {SCOPES.find(s => s.value === formData.scope)?.description}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Источник модели AI
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className={`cursor-pointer rounded-lg border p-3 transition-all ${formData.modelProvider === 'subscription'
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
                                        }`}
                                    onClick={() => setFormData(prev => ({ ...prev, modelProvider: 'subscription' }))}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border ${formData.modelProvider === 'subscription' ? 'border-4 border-indigo-500' : 'border-neutral-500'
                                            }`} />
                                        <span className="text-sm font-medium">Подписка</span>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-400 ml-6">
                                        Модели, включенные в тариф
                                    </p>
                                </div>

                                <div
                                    className={`cursor-pointer rounded-lg border p-3 transition-all ${formData.modelProvider === 'openai_api_key'
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
                                        }`}
                                    onClick={() => setFormData(prev => ({ ...prev, modelProvider: 'openai_api_key' }))}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border ${formData.modelProvider === 'openai_api_key' ? 'border-4 border-indigo-500' : 'border-neutral-500'
                                            }`} />
                                        <span className="text-sm font-medium">Свой ключ</span>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-400 ml-6">
                                        Ваш личный API ключ
                                    </p>
                                </div>
                            </div>
                        </div>

                        {formData.modelProvider === 'openai_api_key' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-sm font-medium text-neutral-300">
                                    OpenAI API Key <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="sk-..."
                                    required
                                    className="bg-neutral-900 border-neutral-700"
                                />
                                <p className="text-xs text-neutral-500">
                                    Требуется для работы агента через ваш аккаунт OpenAI.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Шаблоны ответов (один на строку)
                            </label>
                            <Textarea
                                value={formData.responseTemplates}
                                onChange={e => setFormData(prev => ({ ...prev, responseTemplates: e.target.value }))}
                                placeholder="Принято, работаю!&#10;Задача выполнена."
                                className="min-h-[100px] bg-neutral-900 border-neutral-700"
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-neutral-300">
                                    Автоответ на упоминания
                                </label>
                                <p className="text-xs text-neutral-500">
                                    Агент автоматически ответит, если его упомянуть (@)
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.autoRespond}
                                onChange={e => setFormData(prev => ({ ...prev, autoRespond: e.target.checked }))}
                                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Стиль ответа
                            </label>
                            <select
                                value={formData.responseStyle}
                                onChange={e => setFormData(prev => ({ ...prev, responseStyle: e.target.value as 'short' | 'detailed' }))}
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="short">Краткий (Лаконичные ответы)</option>
                                <option value="detailed">Подробный (Развернутые объяснения)</option>
                            </select>
                        </div>
                    </ModalBody>

                    <ModalFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Создание...' : 'Создать агента'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}
