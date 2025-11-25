'use client';

import { useRouter } from 'next/navigation';
// @ts-ignore
import { Building2, User } from 'lucide-react';
import { ContentBlock } from '@/components/ui/content-block';

export default function OnboardingPage() {
    const router = useRouter();

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                    Выберите свою роль
                </h2>
                <p className="mt-2 text-[color:var(--text-secondary)]">
                    Это поможет нам настроить платформу под ваши нужды
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Company Card */}
                <ContentBlock
                    className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    onClick={() => router.push('/onboarding/create-organization')}
                >
                    <div className="flex flex-col items-center p-8 text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                            <Building2 className="h-12 w-12 text-white" />
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-[color:var(--text-primary)]">
                            Я представляю компанию
                        </h3>
                        <p className="text-sm text-[color:var(--text-secondary)]">
                            Создайте организацию, управляйте проектами и командой, находите специалистов для выполнения задач
                        </p>
                        <div className="mt-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
                                <span>✓</span> Управление проектами
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
                                <span>✓</span> Поиск исполнителей
                            </div>
                        </div>
                    </div>
                </ContentBlock>

                {/* Specialist Card */}
                <ContentBlock
                    className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    onClick={() => router.push('/onboarding/create-profile')}
                >
                    <div className="flex flex-col items-center p-8 text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
                            <User className="h-12 w-12 text-white" />
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-[color:var(--text-primary)]">
                            Я специалист
                        </h3>
                        <p className="text-sm text-[color:var(--text-secondary)]">
                            Создайте профиль исполнителя, покажите свои навыки и получайте предложения о работе
                        </p>
                        <div className="mt-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
                                <span>✓</span> Профиль в каталоге
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
                                <span>✓</span> Приглашения в проекты
                            </div>
                        </div>
                    </div>
                </ContentBlock>
            </div>

            <div className="mt-8 text-center">
                <button
                    onClick={() => router.push('/app/dashboard')}
                    className="text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] underline"
                >
                    Пропустить и перейти к панели управления
                </button>
            </div>
        </div>
    );
}
