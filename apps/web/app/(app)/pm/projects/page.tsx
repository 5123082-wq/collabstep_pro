'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProjectsList from '@/components/pm/ProjectsList';
import { type Project } from '@/types/pm';
import { flags } from '@/lib/flags';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';

export default function PMProjectsPage() {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return <FeatureComingSoon title="Проекты" />;
  }

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const response = await fetch('/api/pm/projects');
        if (!response.ok) {
          throw new Error('Failed to load projects');
        }
        const data = await response.json();
        setProjects(data.items || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Проекты</h1>
        <p className="mt-2 text-sm text-neutral-400">Управляйте всеми вашими проектами</p>
      </header>

      <ProjectsList projects={projects} loading={loading} error={error} />
    </div>
  );
}
