'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppSection from '@/components/app/AppSection';
import { TeamMembersList } from '@/components/organizations/TeamMembersList';
import { InviteMemberModal } from '@/components/organizations/InviteMemberModal';
import { type TeamMember } from '@/components/organizations/TeamMemberCard';
import { type OrganizationRole } from '@/components/organizations/RoleBadge';
import { toast } from 'sonner';

export default function OrgTeamPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string | undefined;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<OrganizationRole | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Fetch current user
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.userId) {
            setCurrentUserId(data.userId);
          }
        }
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    }
    void loadCurrentUser();
  }, []);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`);

      if (res.status === 401) {
        router.replace('/login?toast=auth-required');
        return;
      }

      if (res.status === 403) {
        router.replace('/org/team?toast=forbidden');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await res.json();
      const membersList = data.members || [];
      setMembers(membersList);

      // Determine current user's role
      if (currentUserId && membersList.length > 0) {
        const currentMember = membersList.find((m: TeamMember) => m.userId === currentUserId);
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        }
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Ошибка', {
        description: 'Не удалось загрузить список участников',
      });
    } finally {
      setIsLoading(false);
    }
  }, [orgId, currentUserId, router]);

  useEffect(() => {
    void fetchMembers();
  }, [orgId, currentUserId, fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: OrganizationRole) => {
    if (!orgId) return;

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        throw new Error('Failed to update role');
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );

      toast.success('Роль обновлена', {
        description: 'Роль участника успешно изменена',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Ошибка', {
        description: 'Не удалось изменить роль участника',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId) return;

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove member');
      }

      // Soft-remove: keep row and mark inactive for history/reactivation.
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status: 'inactive' } : m)));

      toast.success('Участник отключён', {
        description: 'Участник переведён в статус inactive и потерял доступ к данным организации',
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Ошибка', {
        description: 'Не удалось удалить участника',
      });
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: 'active' | 'inactive' | 'blocked') => {
    if (!orgId) return;

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m)));

      toast.success('Статус обновлён', {
        description: `Статус участника изменён на ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка', {
        description: 'Не удалось изменить статус участника',
      });
    }
  };

  const handleInviteSuccess = () => {
    // Refresh members list after successful invite
    void fetchMembers();
  };

  if (!orgId) {
    return (
      <AppSection
        title="Команда"
        description="Выберите организацию для управления командой"
      />
    );
  }

  return (
    <>
      <AppSection
        title="Команда"
        description="Управляйте ролями, доступами и составом участников организации"
        actions={
          canInvite
            ? [
                {
                  label: 'Пригласить в команду',
                  onClick: () => setIsInviteModalOpen(true),
                },
              ]
            : []
        }
        hideStateToggles={true}
      >
        <TeamMembersList
          members={members}
          currentUserRole={currentUserRole}
          isLoading={isLoading}
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
          onStatusChange={handleStatusChange}
        />
      </AppSection>

      <InviteMemberModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        organizationId={orgId}
        onSuccess={handleInviteSuccess}
      />
    </>
  );
}
