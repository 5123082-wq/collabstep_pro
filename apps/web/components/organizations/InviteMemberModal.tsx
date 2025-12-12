'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleBadge, type OrganizationRole } from './RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/lib/ui/useDebouncedValue';
// @ts-expect-error lucide-react icon types
import { Mail, Link2, Copy, Check, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    onSuccess?: () => void;
}

type InviteeLookupUser = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

type InviteeLookupState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; user: InviteeLookupUser }
    | { status: 'not_found' }
    | { status: 'error'; message: string };

type OrganizationProjectListItem = {
    id: string;
    name: string;
};

type ListOrganizationProjectsResponse =
    | { ok: true; data: { projects: OrganizationProjectListItem[] } }
    | { ok: false; error: string; details?: string };

export function InviteMemberModal({ open, onOpenChange, organizationId, onSuccess }: InviteMemberModalProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'link'>('email');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Email invite state
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<OrganizationRole>('member');
    const [selectedInviteeUserId, setSelectedInviteeUserId] = useState<string | null>(null);
    const [lookupState, setLookupState] = useState<InviteeLookupState>({ status: 'idle' });
    const debouncedEmail = useDebouncedValue(email, 400);

    // Optional preview projects
    const [showPreviewProjects, setShowPreviewProjects] = useState(false);
    const [projects, setProjects] = useState<OrganizationProjectListItem[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [projectsError, setProjectsError] = useState<string | null>(null);
    const [selectedPreviewProjectIds, setSelectedPreviewProjectIds] = useState<string[]>([]);

    // Link invite state
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

    useEffect(() => {
        if (!open || activeTab !== 'email') {
            return;
        }

        const query = debouncedEmail.trim().toLowerCase();
        if (!query) {
            setLookupState({ status: 'idle' });
            setSelectedInviteeUserId(null);
            return;
        }

        // Simple guard: avoid spamming lookup on clearly invalid input; keep it permissive.
        if (!query.includes('@') || query.length < 5) {
            setLookupState({ status: 'idle' });
            setSelectedInviteeUserId(null);
            return;
        }

        const controller = new AbortController();
        setLookupState({ status: 'loading' });
        setSelectedInviteeUserId(null);

        void (async () => {
            try {
                const response = await fetch(
                    `/api/organizations/${organizationId}/invitee-lookup?email=${encodeURIComponent(query)}`,
                    { signal: controller.signal }
                );

                const data = (await response.json().catch(() => null)) as
                    | { ok: true; data: { user: InviteeLookupUser | null } }
                    | { ok: false; error: string; details?: string }
                    | null;

                if (controller.signal.aborted) return;

                if (!response.ok || !data || !data.ok) {
                    setLookupState({
                        status: 'error',
                        message: (data && !data.ok ? data.details || data.error : null) ?? 'Не удалось выполнить поиск',
                    });
                    return;
                }

                if (!data.data.user) {
                    setLookupState({ status: 'not_found' });
                    return;
                }

                setLookupState({ status: 'found', user: data.data.user });
                setSelectedInviteeUserId(data.data.user.id);
            } catch (error) {
                if (controller.signal.aborted) return;
                setLookupState({ status: 'error', message: 'Не удалось выполнить поиск' });
            }
        })();

        return () => controller.abort();
    }, [activeTab, debouncedEmail, open, organizationId]);

    useEffect(() => {
        if (!open || activeTab !== 'email' || !showPreviewProjects) {
            return;
        }

        const controller = new AbortController();
        setProjectsError(null);
        setLoadingProjects(true);

        void (async () => {
            try {
                const response = await fetch(`/api/organizations/${organizationId}/projects`, { signal: controller.signal });
                const data = (await response.json().catch(() => null)) as ListOrganizationProjectsResponse | null;
                if (controller.signal.aborted) return;
                if (!response.ok || !data || !data.ok) {
                    setProjectsError((data && !data.ok ? data.details || data.error : null) ?? 'Не удалось загрузить проекты');
                    setProjects([]);
                    return;
                }
                setProjects(data.data.projects);
            } catch (_error) {
                if (controller.signal.aborted) return;
                setProjectsError('Не удалось загрузить проекты');
                setProjects([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingProjects(false);
                }
            }
        })();

        return () => controller.abort();
    }, [activeTab, open, organizationId, showPreviewProjects]);

    const handleEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/organizations/${organizationId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'email',
                    ...(selectedInviteeUserId ? { inviteeUserId: selectedInviteeUserId } : { email: normalizedEmail }),
                    role: selectedRole,
                    ...(showPreviewProjects && selectedPreviewProjectIds.length
                        ? { previewProjectIds: selectedPreviewProjectIds }
                        : {}),
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.message || 'Failed to send invitation');
            }

            toast.success('Приглашение отправлено!', {
                description: selectedInviteeUserId ? 'Пользователь приглашён' : `Приглашение отправлено на ${normalizedEmail}`,
            });

            setEmail('');
            setSelectedRole('member');
            setSelectedInviteeUserId(null);
            setLookupState({ status: 'idle' });
            setShowPreviewProjects(false);
            setProjects([]);
            setProjectsError(null);
            setLoadingProjects(false);
            setSelectedPreviewProjectIds([]);

            if (onSuccess) {
                onSuccess();
            }

            onOpenChange(false);
        } catch (err) {
            toast.error('Ошибка', {
                description: err instanceof Error ? err.message : 'Не удалось отправить приглашение',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateLink = async () => {
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/organizations/${organizationId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'link',
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.message || 'Failed to generate link');
            }

            const data = await res.json();
            const fullLink = `${window.location.origin}${data.link}`;
            setGeneratedLink(fullLink);

            toast.success('Ссылка создана!', {
                description: 'Пригласительная ссылка успешно создана',
            });
        } catch (err) {
            toast.error('Ошибка', {
                description: err instanceof Error ? err.message : 'Не удалось создать ссылку',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyLink = async () => {
        if (!generatedLink) return;

        try {
            await navigator.clipboard.writeText(generatedLink);
            setIsCopied(true);
            toast.success('Скопировано!', {
                description: 'Ссылка скопирована в буфер обмена',
            });

            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error('Ошибка', {
                description: 'Не удалось скопировать ссылку',
            });
        }
    };

    const handleClose = () => {
        setEmail('');
        setSelectedRole('member');
        setSelectedInviteeUserId(null);
        setLookupState({ status: 'idle' });
        setShowPreviewProjects(false);
        setProjects([]);
        setProjectsError(null);
        setLoadingProjects(false);
        setSelectedPreviewProjectIds([]);
        setGeneratedLink(null);
        setIsCopied(false);
        onOpenChange(false);
    };

    return (
        <Modal open={open} onOpenChange={handleClose}>
            <ModalContent className="max-w-lg">
                <ModalHeader>
                    <ModalTitle>Пригласить в команду</ModalTitle>
                    <ModalClose />
                </ModalHeader>

                <ModalBody>
                    <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'email' | 'link')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="email" className="gap-2">
                                <Mail className="h-4 w-4" />
                                По Email
                            </TabsTrigger>
                            <TabsTrigger value="link" className="gap-2">
                                <Link2 className="h-4 w-4" />
                                По ссылке
                            </TabsTrigger>
                        </TabsList>

                        {/* Email Tab */}
                        <TabsContent value="email" className="space-y-4 mt-4">
                            <form onSubmit={handleEmailInvite} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Email адрес
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@example.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setSelectedInviteeUserId(null);
                                            setLookupState({ status: 'idle' });
                                        }}
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {lookupState.status === 'loading' ? (
                                        <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                            Ищем пользователя…
                                        </div>
                                    ) : lookupState.status === 'found' ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedInviteeUserId((current) =>
                                                    current === lookupState.user.id ? null : lookupState.user.id
                                                )
                                            }
                                            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-secondary)] p-3 text-left transition hover:bg-[color:var(--surface-muted)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    {lookupState.user.avatarUrl ? (
                                                        <AvatarImage src={lookupState.user.avatarUrl} alt={lookupState.user.email} />
                                                    ) : null}
                                                    <AvatarFallback>
                                                        {(lookupState.user.name ?? lookupState.user.email)
                                                            .slice(0, 1)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                                                        {lookupState.user.name ?? 'Пользователь'}
                                                    </div>
                                                    <div className="truncate text-xs text-[color:var(--text-tertiary)]">
                                                        {lookupState.user.email}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[color:var(--text-tertiary)]">
                                                    {selectedInviteeUserId === lookupState.user.id ? 'Выбрано' : 'Выбрать'}
                                                </div>
                                            </div>
                                        </button>
                                    ) : lookupState.status === 'not_found' ? (
                                        <p className="text-xs text-[color:var(--text-tertiary)]">
                                            Пользователь не найден — отправим приглашение на регистрацию.
                                        </p>
                                    ) : lookupState.status === 'error' ? (
                                        <p className="text-xs text-red-300">{lookupState.message}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="role" className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Роль в организации
                                    </label>
                                    <Select value={selectedRole} onValueChange={(v: string) => setSelectedRole(v as OrganizationRole)}>
                                        <SelectTrigger id="role" disabled={isSubmitting}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <RoleBadge role="admin" />
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="member">
                                                <div className="flex items-center gap-2">
                                                    <RoleBadge role="member" />
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="viewer">
                                                <div className="flex items-center gap-2">
                                                    <RoleBadge role="viewer" />
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-[color:var(--text-tertiary)]">
                                        Роль можно будет изменить позже
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-medium text-[color:var(--text-secondary)]">
                                                Проекты для ознакомления (опционально)
                                            </div>
                                            <div className="text-xs text-[color:var(--text-tertiary)]">
                                                Выберите проекты, которые приглашённый сможет увидеть в контексте приглашения.
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setShowPreviewProjects((prev) => !prev);
                                                setSelectedPreviewProjectIds([]);
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            {showPreviewProjects ? 'Скрыть' : 'Выбрать'}
                                        </Button>
                                    </div>

                                    {showPreviewProjects ? (
                                        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-secondary)] p-3">
                                            {loadingProjects ? (
                                                <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                    Загружаем проекты…
                                                </div>
                                            ) : projectsError ? (
                                                <div className="text-xs text-red-300">{projectsError}</div>
                                            ) : projects.length === 0 ? (
                                                <div className="text-xs text-[color:var(--text-tertiary)]">
                                                    Нет доступных проектов в этой организации.
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {projects.map((project) => {
                                                        const selected = selectedPreviewProjectIds.includes(project.id);
                                                        return (
                                                            <button
                                                                key={project.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPreviewProjectIds((prev) =>
                                                                        prev.includes(project.id)
                                                                            ? prev.filter((id) => id !== project.id)
                                                                            : [...prev, project.id]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    'rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                                                                    selected
                                                                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-100'
                                                                        : 'border-[color:var(--surface-border-subtle)] bg-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)]'
                                                                )}
                                                            >
                                                                {project.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {selectedPreviewProjectIds.length ? (
                                                <div className="mt-2 text-xs text-[color:var(--text-tertiary)]">
                                                    Выбрано проектов: {selectedPreviewProjectIds.length}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                                        Отмена
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Отправка...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Отправить приглашение
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Link Tab */}
                        <TabsContent value="link" className="space-y-4 mt-4">
                            <div className="space-y-4">
                                <p className="text-sm text-[color:var(--text-secondary)]">
                                    Создайте пригласительную ссылку, которую можно отправить любому человеку. Любой, у кого есть эта
                                    ссылка, сможет присоединиться к организации.
                                </p>

                                {!generatedLink ? (
                                    <Button
                                        onClick={handleGenerateLink}
                                        disabled={isSubmitting}
                                        className="w-full gap-2"
                                        size="lg"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Создание ссылки...
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="h-4 w-4" />
                                                Создать пригласительную ссылку
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-secondary)] p-4">
                                            <p className="text-xs font-medium text-[color:var(--text-tertiary)] mb-2">
                                                Пригласительная ссылка
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-sm text-[color:var(--text-primary)] break-all">
                                                    {generatedLink}
                                                </code>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleCopyLink}
                                                    className="shrink-0 gap-2"
                                                >
                                                    {isCopied ? (
                                                        <>
                                                            <Check className="h-4 w-4" />
                                                            Скопировано
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-4 w-4" />
                                                            Копировать
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" onClick={handleClose}>
                                                Закрыть
                                            </Button>
                                            <Button onClick={handleGenerateLink} variant="secondary" className="gap-2">
                                                <Link2 className="h-4 w-4" />
                                                Создать новую ссылку
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
