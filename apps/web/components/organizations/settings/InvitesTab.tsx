'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function InvitesTab({ orgId }: { orgId: string }) {
  useEffect(() => {
    // Fetch invites
    // fetch(`/api/organizations/${orgId}/invites`).then...
    // For now mocking or assuming empty as API might need implementation details
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

