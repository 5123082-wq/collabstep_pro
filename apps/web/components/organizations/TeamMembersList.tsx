'use client';

import { useState, useMemo } from 'react';
import { TeamMemberCard, type TeamMember } from './TeamMemberCard';
import { type OrganizationRole } from './RoleBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// @ts-ignore
import { Search, Filter, Users, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface TeamMembersListProps {
    members: TeamMember[];
    currentUserRole?: OrganizationRole | undefined;
    isLoading?: boolean;
    onRoleChange?: ((memberId: string, newRole: OrganizationRole) => void) | undefined;
    onRemove?: ((memberId: string) => void) | undefined;
}

export function TeamMembersList({
    members,
    currentUserRole,
    isLoading,
    onRoleChange,
    onRemove,
}: TeamMembersListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<Set<OrganizationRole>>(new Set());
    const [statusFilter, setStatusFilter] = useState<Set<'active' | 'inactive' | 'blocked'>>(new Set());

    // Filter and search logic
    const filteredMembers = useMemo(() => {
        return members.filter((member) => {
            // Search filter
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                member.user?.name?.toLowerCase().includes(searchLower) ||
                member.user?.email?.toLowerCase().includes(searchLower);

            // Role filter
            const matchesRole = roleFilter.size === 0 || roleFilter.has(member.role);

            // Status filter
            const matchesStatus = statusFilter.size === 0 || statusFilter.has(member.status);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [members, searchQuery, roleFilter, statusFilter]);

    const toggleRoleFilter = (role: OrganizationRole) => {
        setRoleFilter((prev) => {
            const next = new Set(prev);
            if (next.has(role)) {
                next.delete(role);
            } else {
                next.add(role);
            }
            return next;
        });
    };

    const toggleStatusFilter = (status: 'active' | 'inactive' | 'blocked') => {
        setStatusFilter((prev) => {
            const next = new Set(prev);
            if (next.has(status)) {
                next.delete(status);
            } else {
                next.add(status);
            }
            return next;
        });
    };

    const clearFilters = () => {
        setRoleFilter(new Set());
        setStatusFilter(new Set());
        setSearchQuery('');
    };

    const hasActiveFilters = roleFilter.size > 0 || statusFilter.size > 0 || searchQuery;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[color:var(--accent)] mx-auto mb-3" />
                    <p className="text-sm text-[color:var(--text-secondary)]">Загрузка участников...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
                    <Input
                        type="text"
                        placeholder="Поиск по имени или email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filter Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            className="gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Фильтры
                            {hasActiveFilters && (
                                <span className="ml-1 rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-xs text-white">
                                    {roleFilter.size + statusFilter.size}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Роль</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter.has('owner')}
                            onCheckedChange={() => toggleRoleFilter('owner')}
                        >
                            Владелец
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter.has('admin')}
                            onCheckedChange={() => toggleRoleFilter('admin')}
                        >
                            Администратор
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter.has('member')}
                            onCheckedChange={() => toggleRoleFilter('member')}
                        >
                            Участник
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter.has('viewer')}
                            onCheckedChange={() => toggleRoleFilter('viewer')}
                        >
                            Наблюдатель
                        </DropdownMenuCheckboxItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel>Статус</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter.has('active')}
                            onCheckedChange={() => toggleStatusFilter('active')}
                        >
                            Активен
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter.has('inactive')}
                            onCheckedChange={() => toggleStatusFilter('inactive')}
                        >
                            Неактивен
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={statusFilter.has('blocked')}
                            onCheckedChange={() => toggleStatusFilter('blocked')}
                        >
                            Заблокирован
                        </DropdownMenuCheckboxItem>

                        {hasActiveFilters && (
                            <>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="w-full justify-center text-xs"
                                    >
                                        Сбросить фильтры
                                    </Button>
                                </div>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-[color:var(--text-secondary)]">
                    {filteredMembers.length === members.length ? (
                        <>
                            <Users className="inline h-4 w-4 mr-1" />
                            Всего участников: <span className="font-semibold">{members.length}</span>
                        </>
                    ) : (
                        <>
                            Найдено: <span className="font-semibold">{filteredMembers.length}</span> из {members.length}
                        </>
                    )}
                </p>
                {hasActiveFilters && (
                    <Button variant="secondary" size="sm" onClick={clearFilters} className="text-xs">
                        Сбросить фильтры
                    </Button>
                )}
            </div>

            {/* Members Grid */}
            {filteredMembers.length === 0 ? (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[color:var(--surface-secondary)] mb-4">
                        <Users className="h-8 w-8 text-[color:var(--text-tertiary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)] mb-2">
                        {members.length === 0 ? 'Нет участников' : 'Ничего не найдено'}
                    </h3>
                    <p className="text-sm text-[color:var(--text-secondary)] mb-4">
                        {members.length === 0
                            ? 'Пригласите первых участников в команду'
                            : 'Попробуйте изменить параметры поиска или фильтры'}
                    </p>
                    {hasActiveFilters && (
                        <Button variant="secondary" onClick={clearFilters}>
                            Сбросить фильтры
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                        <TeamMemberCard
                            key={member.id}
                            member={member}
                            currentUserRole={currentUserRole}
                            onRoleChange={onRoleChange}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
