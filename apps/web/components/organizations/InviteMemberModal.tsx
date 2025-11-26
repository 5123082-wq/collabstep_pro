'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleBadge, type OrganizationRole } from './RoleBadge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
// @ts-ignore
import { Mail, Link2, Copy, Check, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    onSuccess?: () => void;
}

export function InviteMemberModal({ open, onOpenChange, organizationId, onSuccess }: InviteMemberModalProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'link'>('email');
    const [isLoading, setIsLoading] = useState(false);

    // Email invite state
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<OrganizationRole>('member');

    // Link invite state
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch(`/api/organizations/${organizationId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'email',
                    email,
                    role: selectedRole,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.message || 'Failed to send invitation');
            }

            toast.success('Приглашение отправлено!', {
                description: `Приглашение отправлено на ${email}`,
            });

            setEmail('');
            setSelectedRole('member');

            if (onSuccess) {
                onSuccess();
            }

            onOpenChange(false);
        } catch (err) {
            toast.error('Ошибка', {
                description: err instanceof Error ? err.message : 'Не удалось отправить приглашение',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setIsLoading(true);

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
            setIsLoading(false);
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
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="role" className="text-sm font-medium text-[color:var(--text-secondary)]">
                                        Роль в организации
                                    </label>
                                    <Select value={selectedRole} onValueChange={(v: string) => setSelectedRole(v as OrganizationRole)}>
                                        <SelectTrigger id="role" disabled={isLoading}>
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

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
                                        Отмена
                                    </Button>
                                    <Button type="submit" disabled={isLoading} className="gap-2">
                                        {isLoading ? (
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
                                        disabled={isLoading}
                                        className="w-full gap-2"
                                        size="lg"
                                    >
                                        {isLoading ? (
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
