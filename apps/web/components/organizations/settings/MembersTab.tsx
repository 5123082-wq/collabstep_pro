'use client';

import { useEffect, useState } from 'react';

interface Member {
  id: string; // organization_member id? or user id? let's see repository
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'suspended';
  // ideally we would have user details expanded here, but let's see what the API returns
}

// Helper to fetch members
async function getMembers(orgId: string) {
  const res = await fetch(`/api/organizations/${orgId}/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  const data = await res.json();
  return data.members || [];
}

export function MembersTab({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMembers(orgId)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [orgId]);

  if (isLoading) return <div>Loading members...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium leading-6 text-[color:var(--text-primary)]">Участники</h3>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Управляйте доступом к организации.
          </p>
        </div>
        {/* Invite button could go here or in Invites tab. Plan says "Invites" is a separate tab. */}
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--surface-border-subtle)]">
        <table className="min-w-full divide-y divide-[color:var(--surface-border-subtle)]">
          <thead className="bg-[color:var(--surface-muted)]">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">
                Пользователь
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">
                Роль
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">
                Статус
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-[color:var(--surface-base)] divide-y divide-[color:var(--surface-border-subtle)]">
            {members.map((member) => (
              <tr key={member.userId}> {/* Using userId as key for now */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[color:var(--text-primary)]">
                    User {member.userId.substring(0, 8)}... {/* Placeholder until we have expanded user details */}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {member.role !== 'owner' && (
                    <button className="text-indigo-600 hover:text-indigo-900">
                      Изменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

