'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LeaveOrganizationButtonProps = {
  orgId: string;
  orgName: string;
  className?: string;
};

export function LeaveOrganizationButton({ orgId, orgName, className }: LeaveOrganizationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLeave = async () => {
    if (isLoading) return;
    const confirmed = window.confirm(`Покинуть организацию «${orgName}»? Доступ к данным команды будет закрыт.`);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}/leave`, { method: 'POST' });
      if (!res.ok) {
        // keep UX minimal: refresh to re-sync state; server will decide access
        setIsLoading(false);
        router.refresh();
        return;
      }
      router.push('/org/team');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLeave()}
      disabled={isLoading}
      className={
        className ??
        'rounded-xl border border-transparent bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-500/40 hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      {isLoading ? 'Выходим…' : 'Покинуть'}
    </button>
  );
}


