'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';

type OrganizationOption = {
  id: string;
  name: string;
};

type ProjectOrganizationCardProps = {
  projectId: string;
  canManage: boolean;
};

export default function ProjectOrganizationCard({ projectId, canManage }: ProjectOrganizationCardProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadOrganizations() {
      try {
        const res = await fetch('/api/organizations');
        const payload = await res.json();
        if (!cancelled) {
          const orgs = payload?.ok ? payload.data?.organizations || [] : [];
          setOrganizations(orgs);
        }
      } catch (error) {
        if (!cancelled) {
          setOrganizations([]);
        }
      }
    }
    void loadOrganizations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProjectOrganization() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pm/projects/${projectId}/organization`, {
          headers: { 'cache-control': 'no-store' }
        });
        const payload = await res.json();
        if (!cancelled) {
          const orgId = payload?.ok ? payload.data?.organizationId ?? null : null;
          setCurrentOrganizationId(orgId);
          setSelectedOrganizationId(orgId ?? '');
        }
      } catch (error) {
        if (!cancelled) {
          setCurrentOrganizationId(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    if (projectId) {
      void loadProjectOrganization();
    }
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const currentOrganization = useMemo(() => {
    if (!currentOrganizationId) return null;
    return organizations.find((org) => org.id === currentOrganizationId) ?? null;
  }, [organizations, currentOrganizationId]);

  useEffect(() => {
    if (!currentOrganizationId && !selectedOrganizationId && organizations.length > 0) {
      setSelectedOrganizationId(organizations[0]?.id ?? '');
    }
  }, [currentOrganizationId, selectedOrganizationId, organizations]);

  const canSave =
    selectedOrganizationId.trim().length > 0 &&
    selectedOrganizationId !== currentOrganizationId &&
    !saving;

  const handleSave = async () => {
    if (!canManage) {
      toast('Недостаточно прав для смены организации', 'warning');
      return;
    }
    if (!selectedOrganizationId.trim()) {
      toast('Выберите организацию', 'warning');
      return;
    }
    if (selectedOrganizationId === currentOrganizationId) {
      toast('Организация уже выбрана', 'warning');
      return;
    }
    if (!confirm('Перенести проект в другую организацию? Файлы и папки будут закреплены за новой организацией.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/pm/projects/${projectId}/organization`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrganizationId })
      });
      const payload = await res.json();
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || `Request failed: ${res.status}`);
      }
      setCurrentOrganizationId(selectedOrganizationId);
      toast('Организация проекта обновлена', 'success');
    } catch (error) {
      console.error(error);
      toast('Не удалось обновить организацию проекта', 'warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentBlock size="sm">
      <ContentBlockTitle
        as="h3"
        description="Выберите организацию, которая отвечает за проект и его файлы."
      >
        Организация проекта
      </ContentBlockTitle>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-neutral-800/50 bg-neutral-900/30 px-4 py-3 text-xs text-neutral-300">
          {loading ? (
            'Загрузка данных...'
          ) : currentOrganization ? (
            <>
              Текущая организация: <span className="text-white">{currentOrganization.name}</span>
            </>
          ) : currentOrganizationId ? (
            <>
              Текущая организация: <span className="text-white">{currentOrganizationId}</span>
            </>
          ) : (
            'Организация не назначена.'
          )}
        </div>

        {organizations.length > 0 ? (
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Организация
            <select
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              disabled={!canManage}
              className={cn(
                'w-full rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none',
                !canManage && 'cursor-not-allowed opacity-60'
              )}
            >
              <option value="">Выберите организацию</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-xl border border-neutral-900 bg-neutral-950/60 px-4 py-3 text-xs text-neutral-400">
            Нет доступных организаций. Сначала создайте организацию.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span>При переносе пересчитывается использование хранилища.</span>
          {!canManage && <span className="text-rose-300">Только владелец проекта может менять организацию.</span>}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || !canManage || loading}
          className={cn(
            'rounded-xl border border-indigo-500/60 bg-indigo-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/30',
            (!canSave || !canManage || loading) && 'cursor-not-allowed opacity-60'
          )}
        >
          {saving ? 'Сохраняем…' : 'Сохранить организацию'}
        </button>
      </div>
    </ContentBlock>
  );
}
