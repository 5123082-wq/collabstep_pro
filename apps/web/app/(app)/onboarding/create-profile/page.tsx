'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
// @ts-ignore
import { User, ArrowLeft } from 'lucide-react';

export default function CreateProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        specialization: '',
        skills: [] as string[],
        bio: '',
        rate: 0,
        employmentType: 'contract',
        isPublic: true
    });
    const [skillInput, setSkillInput] = useState('');

    const addSkill = (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        e?.preventDefault();

        const skill = skillInput.trim();
        if (skill && !formData.skills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.specialization.trim()) {
            toast('Пожалуйста, укажите вашу специализацию', 'warning');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/me/performer-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.details || err.error?.message || 'Failed to create profile');
            }

            toast('Профиль успешно создан!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                router.push('/app/dashboard');
            }, 500);
        } catch (err: any) {
            console.error(err);
            toast(err.message || 'Ошибка при создании профиля', 'warning');
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
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                                Создание профиля исполнителя
                            </h2>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Расскажите о своих навыках и опыте
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                Специализация <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={formData.specialization}
                                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                placeholder="Например: Frontend Developer, UX/UI Designer"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                Навыки
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={addSkill}
                                    placeholder="Введите навык и нажмите Enter"
                                    disabled={isLoading}
                                />
                                <Button type="button" onClick={() => addSkill()} variant="secondary" disabled={isLoading}>
                                    Добавить
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.skills.map(skill => (
                                    <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                                        {skill}
                                        <button type="button" onClick={() => removeSkill(skill)} className="hover:text-purple-900" disabled={isLoading}>×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                О себе
                            </label>
                            <Textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Расскажите о своем опыте и проектах..."
                                rows={4}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                    Ставка ($/ч)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.rate}
                                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                    Тип занятости
                                </label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[color:var(--surface-border)] bg-[color:var(--surface-base)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={formData.employmentType}
                                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                                    disabled={isLoading}
                                >
                                    <option value="fulltime">Полная занятость</option>
                                    <option value="parttime">Частичная занятость</option>
                                    <option value="contract">Проектная работа</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded-lg border-2 border-purple-200 bg-purple-50/50 p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={formData.isPublic}
                                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                    className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    disabled={isLoading}
                                />
                                <div>
                                    <label htmlFor="isPublic" className="font-medium text-[color:var(--text-primary)]">
                                        Показывать в каталоге исполнителей
                                    </label>
                                    <p className="text-sm text-[color:var(--text-secondary)]">
                                        Ваш профиль будет виден компаниям, и вас смогут приглашать в проекты
                                    </p>
                                </div>
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
                                {isLoading ? 'Создание...' : 'Создать профиль'}
                            </Button>
                        </div>
                    </form>
                </div>
            </ContentBlock>
        </div>
    );
}
