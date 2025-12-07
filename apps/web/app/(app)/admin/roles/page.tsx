'use client';

// TODO: Подключить к реальному API когда backend будет готов
// - Создать API endpoints для roles (GET /api/admin/roles, POST /api/admin/roles, PATCH /api/admin/roles/[id], DELETE /api/admin/roles/[id])
// - Заменить mockRoles на реальные API вызовы
// - Добавить loading/error states
// - Использовать типы из @collabverse/api

import { useState } from 'react';
import { Shield, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { ContentBlock } from '@/components/ui/content-block';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  system: boolean;
}

const mockRoles: Role[] = [
  {
    id: 'owner',
    name: 'Владелец',
    description: 'Полный доступ ко всем функциям платформы',
    permissions: [
      'platform:full',
      'admin:manage',
      'finance:manage',
      'users:manage',
      'features:toggle'
    ],
    userCount: 5,
    system: true
  },
  {
    id: 'product_admin',
    name: 'Администратор продукта',
    description: 'Управление функциями и фичами',
    permissions: [
      'features:toggle',
      'features:configure',
      'releases:manage',
      'content:manage'
    ],
    userCount: 3,
    system: false
  },
  {
    id: 'tester',
    name: 'Тестировщик',
    description: 'Доступ к тестовым разделам',
    permissions: ['features:test', 'beta:access'],
    userCount: 12,
    system: false
  },
  {
    id: 'support',
    name: 'Поддержка',
    description: 'Access к инструментам поддержки и имперсонации',
    permissions: ['users:impersonate', 'sessions:view', 'tickets:manage'],
    userCount: 8,
    system: false
  }
];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);

  const handleDelete = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.system) {
      toast('Системные роли нельзя удалять', 'warning');
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    toast('Роль удалена', 'success');
  };

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Роли и разрешения"
        actions={
          <button
            onClick={() => toast('TODO: Создать роль', 'info')}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Создать роль
          </button>
        }
      />

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <ContentBlock
            key={role.id}
            size="sm"
            interactive
            className="group relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-500/20 p-2">
                  <Shield className="h-5 w-5 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-50">{role.name}</h3>
                  {role.system && (
                    <span className="text-xs text-indigo-400">Системная роль</span>
                  )}
                </div>
              </div>

              {!role.system && (
                <div className="flex gap-2">
                  <button
                    onClick={() => toast('TODO: Редактировать роль', 'info')}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2 text-neutral-400 transition hover:border-rose-500/40 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <p className="mt-3 text-sm text-neutral-400">{role.description}</p>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <Users className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-400">{role.userCount} пользователей</span>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-neutral-500">Разрешения:</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((perm, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-100"
                  >
                    {perm.split(':')[0]}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-400">
                    +{role.permissions.length - 3}
                  </span>
                )}
              </div>
            </div>
          </ContentBlock>
        ))}
      </div>

      {/* Permissions Reference */}
      <ContentBlock>
        <h2 className="mb-4 text-lg font-semibold text-neutral-50">Справка по разрешениям</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'platform', description: 'Доступ к платформе' },
            { name: 'features', description: 'Управление фичами' },
            { name: 'users', description: 'Управление пользователями' },
            { name: 'finance', description: 'Финансовые операции' },
            { name: 'admin', description: 'Административные функции' },
            { name: 'beta', description: 'Доступ к бета-функциям' }
          ].map((perm) => (
            <div key={perm.name} className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
              <div>
                <p className="font-medium text-neutral-50">{perm.name}</p>
                <p className="text-sm text-neutral-400">{perm.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentBlock>
    </div>
  );
}

