'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProjectsList from '@/components/pm/ProjectsList';
import ProjectDetailModal from '@/components/pm/ProjectDetailModal';
import { type Project } from '@/types/pm';
import { flags } from '@/lib/flags';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';

export default function PMProjectsPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        // Передаем все параметры из URL в API запрос
        const queryString = searchParams.toString();
        const url = queryString ? `/api/pm/projects?${queryString}` : '/api/pm/projects';
        console.log('[PMProjectsPage] Loading projects from:', url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load projects');
        }
        const data = await response.json();
        console.log('[PMProjectsPage] Received projects:', data.items?.length || 0);
        setProjects(data.items || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
    // Используем строковое представление searchParams для правильной работы зависимостей
  }, [searchParams.toString()]);

  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return <FeatureComingSoon title="Проекты" />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Проекты</h1>
        <p className="mt-2 text-sm text-neutral-400">Управляйте всеми вашими проектами</p>
      </header>

      <ProjectsList 
        projects={projects} 
        loading={loading} 
        error={error}
        onOpenProject={(project) => setSelectedProjectId(project.id)}
      />

      {/* Модальное окно проекта */}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          isOpen={!!selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  );
}
