'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { Building2, ArrowLeft } from 'lucide-react';

export default function CreateOrganizationPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'closed' as 'open' | 'closed'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast('Пожалуйста, введите название организации', 'warning');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.details || err.error?.message || 'Failed to create organization');
            }

            toast('Организация успешно создана!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                router.push('/app/dashboard');
            }, 500);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Ошибка при создании организации';
            toast(message, 'warning');
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <button
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            >
                <ArrowLeft className="h-4 w-4" />
                Назад
            </button>

            <ContentBlock>
                <div className="p-8">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                                Создание организации
                            </h2>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Заполните основную информацию о вашей компании
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                Название организации <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Например: ООО 'Инновации'"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                Описание
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Расскажите о вашей организации..."
                                rows={4}
                                disabled={isLoading}
                                className="w-full rounded-md border border-[color:var(--surface-border)] bg-[color:var(--surface-base)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                Тип организации
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'closed' })}
                                    disabled={isLoading}
                                    className={`rounded-lg border-2 p-4 text-left transition-all ${formData.type === 'closed'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-[color:var(--surface-border)] hover:border-[color:var(--surface-border-strong)]'
                                        }`}
                                >
                                    <div className="font-medium text-[color:var(--text-primary)]">Закрытая</div>
                                    <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                                        Только по приглашениям
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'open' })}
                                    disabled={isLoading}
                                    className={`rounded-lg border-2 p-4 text-left transition-all ${formData.type === 'open'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-[color:var(--surface-border)] hover:border-[color:var(--surface-border-strong)]'
                                        }`}
                                >
                                    <div className="font-medium text-[color:var(--text-primary)]">Открытая</div>
                                    <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                                        Видна в каталоге
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={isLoading} className="flex-1">
                                {isLoading ? 'Создание...' : 'Создать организацию'}
                            </Button>
                        </div>
                    </form>
                </div>
            </ContentBlock>
        </div>
    );
}
