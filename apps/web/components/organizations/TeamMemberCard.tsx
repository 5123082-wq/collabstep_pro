'use client';

import { useState } from 'react';
import { RoleBadge, type OrganizationRole } from './RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
// @ts-expect-error lucide-react icon types
import { MoreVertical, Mail, Shield, UserX } from 'lucide-react';

export interface TeamMember {
    id: string;
    userId: string;
    organizationId: string;
    role: OrganizationRole;
    status: 'active' | 'inactive' | 'blocked';
    createdAt: Date | string;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
}

interface TeamMemberCardProps {
    member: TeamMember;
    currentUserRole?: OrganizationRole | undefined;
    onRoleChange?: ((memberId: string, newRole: OrganizationRole) => void) | undefined;
    onRemove?: ((memberId: string) => void) | undefined;
}

export function TeamMemberCard({ member, currentUserRole, onRoleChange, onRemove }: TeamMemberCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
    const canChangeRole = canManage && member.role !== 'owner';
    const canRemove = canManage && member.role !== 'owner';

    const userName = member.user?.name || 'Без имени';
    const userEmail = member.user?.email || '';
    const userInitials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const statusConfig = {
        active: { label: 'Активен', color: 'bg-green-500' },
        inactive: { label: 'Неактивен', color: 'bg-gray-400' },
        blocked: { label: 'Заблокирован', color: 'bg-red-500' },
    };

    const handleRoleChange = (newRole: OrganizationRole) => {
        if (onRoleChange) {
            onRoleChange(member.id, newRole);
        }
        setIsMenuOpen(false);
    };

    const handleRemove = () => {
        if (onRemove && confirm(`Удалить ${userName} из команды?`)) {
            onRemove(member.id);
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="group relative rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition-all duration-200 hover:border-[color:var(--border-hover)] hover:shadow-lg hover:shadow-black/5">
            {/* Glassmorphism effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            <div className="relative flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-[color:var(--border)] transition-all duration-200 group-hover:ring-[color:var(--accent)]">
                        <AvatarImage src={member.user?.image || undefined} alt={userName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                    {/* Status indicator */}
                    <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--surface)] ${statusConfig[member.status].color}`}
                        title={statusConfig[member.status].label}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[color:var(--text-primary)] truncate">
                                {userName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Mail className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
                                <p className="text-sm text-[color:var(--text-secondary)] truncate">
                                    {userEmail}
                                </p>
                            </div>
                        </div>

                        {/* Actions menu */}
                        {canManage && (
                            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {canChangeRole && (
                                        <>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-[color:var(--text-tertiary)]">
                                                Изменить роль
                                            </div>
                                            {(['admin', 'member', 'viewer'] as OrganizationRole[]).map((role) => (
                                                <DropdownMenuItem
                                                    key={role}
                                                    onClick={() => handleRoleChange(role)}
                                                    disabled={member.role === role}
                                                >
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    <RoleBadge role={role} />
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    {canRemove && (
                                        <DropdownMenuItem
                                            onClick={handleRemove}
                                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                                        >
                                            <UserX className="mr-2 h-4 w-4" />
                                            Удалить из команды
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Role badge */}
                    <div className="mt-3">
                        <RoleBadge role={member.role} />
                    </div>
                </div>
            </div>
        </div>
    );
}
