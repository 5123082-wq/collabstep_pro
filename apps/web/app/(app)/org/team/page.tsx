import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';

export default async function OrgTeamRedirectPage() {
    const user = await getCurrentUser();

    if (!user?.id) {
        redirect('/login?toast=auth-required');
    }

    // Получаем список организаций пользователя
    const organizations = await organizationsRepository.listForUser(user.id);

    if (organizations.length === 0) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
                        <svg
                            className="h-10 w-10 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
                        У вас нет организаций
                    </h2>
                    <p className="mt-3 text-[color:var(--text-secondary)]">
                        У вас пока нет ни одной организации. Создайте свою первую организацию, чтобы начать работу с командой.
                    </p>
                    <div className="mt-8">
                        <a
                            href="/onboarding/create-organization"
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Создать организацию
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Перенаправляем на страницу команды первой организации
    const firstOrg = organizations[0];
    if (!firstOrg) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
                        <svg
                            className="h-10 w-10 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
                        У вас нет организаций
                    </h2>
                    <p className="mt-3 text-[color:var(--text-secondary)]">
                        У вас пока нет ни одной организации. Создайте свою первую организацию, чтобы начать работу с командой.
                    </p>
                    <div className="mt-8">
                        <a
                            href="/onboarding/create-organization"
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Создать организацию
                        </a>
                    </div>
                </div>
            </div>
        );
    }
    redirect(`/org/${firstOrg.id}/team`);
}
