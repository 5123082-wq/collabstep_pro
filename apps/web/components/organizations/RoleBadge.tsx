'use client';

import { cn } from '@/lib/utils';

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

interface RoleBadgeProps {
    role: OrganizationRole;
    className?: string;
}

const roleConfig: Record<OrganizationRole, { label: string; color: string; bgColor: string }> = {
    owner: {
        label: 'Владелец',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    },
    admin: {
        label: 'Администратор',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    },
    member: {
        label: 'Участник',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    },
    viewer: {
        label: 'Наблюдатель',
        color: 'text-gray-700 dark:text-gray-300',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800',
    },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = roleConfig[role];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                'transition-all duration-200',
                config.color,
                config.bgColor,
                className
            )}
        >
            {config.label}
        </span>
    );
}
