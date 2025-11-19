'use client';

import { useEffect, useState } from 'react';
import { flags } from '@/lib/flags';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import ArchivedProjectsList from '@/components/pm/ArchivedProjectsList';
import { type Project } from '@/types/pm';
import { trackEvent } from '@/lib/telemetry';

export default function PMArchivePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArchivedProjects() {
      try {
        setLoading(true);
        const response = await fetch('/api/pm/projects?status=ARCHIVED');
        if (!response.ok) {
          throw new Error('Failed to load archived projects');
        }
        const data = await response.json();
        setProjects(data.items || []);
        setError(null);

        // Аналитика просмотра архива
        trackEvent('pm_archive_viewed', {
          workspaceId: 'current',
          userId: 'current',
          source: 'navigation'
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadArchivedProjects();
  }, []);

  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_ARCHIVE) {
    return <FeatureComingSoon title="Архив" />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Архив проектов</h1>
        <p className="mt-2 text-sm text-neutral-400">Просмотр и восстановление архивных проектов</p>
      </header>

      <ArchivedProjectsList projects={projects} loading={loading} error={error} />
    </div>
  );
}

