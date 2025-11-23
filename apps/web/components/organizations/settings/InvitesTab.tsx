'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Invite {
  id: string;
  email?: string; // If invited by email
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
}

export function InvitesTab({ orgId }: { orgId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch invites
    // fetch(`/api/organizations/${orgId}/invites`).then...
    // For now mocking or assuming empty as API might need implementation details
    setIsLoading(false);
  }, [orgId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium leading-6 text-[color:var(--text-primary)]">Приглашения</h3>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Пригласите новых участников в команду.
          </p>
        </div>
        <Button onClick={() => alert('Invite Modal TODO')}>
          Пригласить участника
        </Button>
      </div>

      <div className="bg-[color:var(--surface-muted)] rounded-lg p-8 text-center border border-[color:var(--surface-border-subtle)] border-dashed">
        <p className="text-[color:var(--text-secondary)]">Нет активных приглашений</p>
      </div>
    </div>
  );
}

