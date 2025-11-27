'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContentBlock } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { useRouter } from 'next/navigation';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    image?: string;
    title?: string;
    department?: string;
    location?: string;
    timezone?: string;
}

const TIMEZONES = [
    'Europe/Moscow',
    'Europe/Kaliningrad',
    'Europe/Samara',
    'Asia/Yekaterinburg',
    'Asia/Omsk',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Yakutsk',
    'Asia/Vladivostok',
    'Asia/Magadan',
    'Asia/Kamchatka',
    'UTC',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
];

export default function ProfileSettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        department: '',
        location: '',
        timezone: 'Europe/Moscow',
        image: '',
    });

    useEffect(() => {
        fetch('/api/me/profile')
            .then(res => res.json())
            .then(data => {
                if (data.profile) {
                    setProfile(data.profile);
                    setFormData({
                        name: data.profile.name || '',
                        title: data.profile.title || '',
                        department: data.profile.department || '',
                        location: data.profile.location || '',
                        timezone: data.profile.timezone || 'Europe/Moscow',
                        image: data.profile.image || '',
                    });
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast('Не удалось загрузить профиль', 'warning');
                setIsLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch('/api/me/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to update');
            }

            toast('Профиль успешно обновлен', 'success');
            router.refresh(); // Refresh server components to show new name/avatar
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Ошибка при сохранении';
            toast(message, 'warning');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-3xl py-8 px-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-1/3 bg-neutral-800 rounded"></div>
                    <div className="h-64 bg-neutral-900 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
                    Настройки профиля
                </h1>
                <p className="mt-2 text-[color:var(--text-secondary)]">
                    Управляйте своей личной информацией и тем, как вас видят другие участники.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <ContentBlock>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-shrink-0">
                            <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-[color:var(--surface-border-strong)] bg-[color:var(--surface-muted)]">
                                {formData.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={formData.image} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[color:var(--text-tertiary)]">
                                        {formData.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">
                                    URL Аватара
                                </label>
                                <Input
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    placeholder="https://..."
                                    className="text-xs"
                                />
                                <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">
                                    Вставьте прямую ссылку на изображение
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Имя
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ваше имя"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Email
                                    </label>
                                    <Input
                                        value={profile?.email || ''}
                                        disabled
                                        className="bg-[color:var(--surface-muted)] text-[color:var(--text-tertiary)]"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Должность (Title)
                                    </label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Например: Product Manager"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Отдел / Департамент
                                    </label>
                                    <Input
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="Например: Design Team"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Локация
                                    </label>
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Город, Страна"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Часовой пояс
                                    </label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-[color:var(--surface-border)] bg-[color:var(--surface-base)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-[color:var(--text-primary)]"
                                    >
                                        {TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>
                                                {tz}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </ContentBlock>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.back()}
                    >
                        Отмена
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
