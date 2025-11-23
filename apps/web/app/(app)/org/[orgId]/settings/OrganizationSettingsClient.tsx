'use client';

import { useState } from 'react';
import { GeneralSettingsTab } from '@/components/organizations/settings/GeneralSettingsTab';
import { MembersTab } from '@/components/organizations/settings/MembersTab';
import { InvitesTab } from '@/components/organizations/settings/InvitesTab';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  isPublicInDirectory: boolean;
}

const TABS = [
  { id: 'general', label: 'Общие' },
  { id: 'members', label: 'Участники' },
  { id: 'invites', label: 'Приглашения' },
] as const;

type TabId = typeof TABS[number]['id'];

export function OrganizationSettingsClient({ organization }: { organization: Organization }) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
          Настройки организации: {organization.name}
        </h1>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] p-6 shadow-sm">
          {activeTab === 'general' && <GeneralSettingsTab organization={organization} />}
          {activeTab === 'members' && <MembersTab orgId={organization.id} />}
          {activeTab === 'invites' && <InvitesTab orgId={organization.id} />}
        </main>
      </div>
    </div>
  );
}

