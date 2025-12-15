import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { organizationsRepository } from '@collabverse/api';
import { LeaveOrganizationButton } from '@/components/organizations/LeaveOrganizationButton';

export default async function OrgTeamRedirectPage() {
    const user = await getCurrentUser();

    if (!user?.id) {
        redirect('/login?toast=auth-required');
    }

    const memberships = await organizationsRepository.listMembershipsForUser(user.id);

    if (memberships.length === 0) {
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

    const active = memberships.filter((m) => m.member.status === 'active');
    const former = memberships.filter((m) => m.member.status !== 'active');

    return (
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">Мои организации</h1>
                <p className="text-sm text-[color:var(--text-secondary)]">
                    Здесь отображаются команды, в которых вы состоите сейчас, и команды, из которых вы вышли.
                </p>
            </header>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                    Активные
                </h2>
                {active.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-6 text-sm text-[color:var(--text-secondary)]">
                        У вас нет активных организаций.
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {active.map(({ organization, member }) => {
                            const canManage = member.role === 'owner' || member.role === 'admin';
                            const canLeave = member.role !== 'owner';
                            return (
                                <li key={organization.id} className="rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-base font-semibold text-[color:var(--text-primary)]">
                                                {organization.name}
                                            </div>
                                            <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                                Роль: <span className="font-semibold">{member.role}</span>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-200">
                                            Активна
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <a
                                            href={`/org/${organization.id}/team`}
                                            className="rounded-xl border border-transparent bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                                        >
                                            Открыть команду
                                        </a>
                                        {canManage ? (
                                            <a
                                                href={`/org/${organization.id}/settings`}
                                                className="rounded-xl border border-transparent bg-[color:var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[color:var(--text-secondary)] transition hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                                            >
                                                Настройки
                                            </a>
                                        ) : null}
                                        {canLeave ? (
                                            <LeaveOrganizationButton orgId={organization.id} orgName={organization.name} />
                                        ) : (
                                            <span className="text-xs text-[color:var(--text-tertiary)]">
                                                Владелец не может покинуть организацию
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
                    Бывшие
                </h2>
                {former.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-6 text-sm text-[color:var(--text-secondary)]">
                        Здесь появятся организации, из которых вы вышли.
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {former.map(({ organization, member }) => (
                            <li key={organization.id} className="rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-base font-semibold text-[color:var(--text-primary)]">
                                            {organization.name}
                                        </div>
                                        <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                            Роль на момент выхода: <span className="font-semibold">{member.role}</span>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-neutral-500/10 px-3 py-1 text-xs font-semibold text-neutral-200">
                                        {member.status === 'inactive' ? 'Вы вышли' : 'Нет доступа'}
                                    </span>
                                </div>
                                <div className="mt-4 text-sm text-[color:var(--text-secondary)]">
                                    Доступ к данным команды закрыт. Попросите владельца или администратора вернуть вас в организацию.
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
