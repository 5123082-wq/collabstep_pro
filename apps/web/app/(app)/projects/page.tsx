import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import ProjectsOverviewPageClient from './ProjectsOverviewPageClient';
import { flags } from '@/lib/flags';
import { getDemoSessionFromCookies } from '@/lib/auth/demo-session.server';
import {
  DEFAULT_PROJECT_FILTERS,
  parseProjectFilters,
  type ProjectListFilters,
  type ProjectScope
} from '@/lib/pm/filters';
import { getProjectsOverview } from '@/lib/pm/projects-overview.server';

export const dynamic = 'force-dynamic';

type PageSearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(searchParams: PageSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }
  return params;
}

function resolveScope(value: string | null | undefined, fallback: ProjectScope): ProjectScope {
  if (value === 'owned' || value === 'member' || value === 'all') {
    return value;
  }
  return fallback;
}

function withDefaultPageSize(filters: ProjectListFilters, pageSize: number): ProjectListFilters {
  return {
    ...filters,
    pageSize: filters.pageSize || pageSize
  };
}

type ProjectsOverviewPageProps = {
  searchParams: PageSearchParams;
};

export default async function ProjectsOverviewPage({ searchParams }: ProjectsOverviewPageProps) {
  if (!flags.PROJECTS_OVERVIEW) {
    return <FeatureComingSoon title="Проекты" />;
  }

  const session = getDemoSessionFromCookies();
  if (!session) {
    return <FeatureComingSoon title="Проекты" description="Требуется авторизация" />;
  }

  const params = toURLSearchParams(searchParams);
  const parsedFilters = parseProjectFilters(params);
  const scope = resolveScope(params.get('scope'), 'owned');

  const mergedFilters: ProjectListFilters = {
    ...DEFAULT_PROJECT_FILTERS,
    ...withDefaultPageSize(parsedFilters, 12),
    scope,
    page: parsedFilters.page,
    sortBy: parsedFilters.sortBy ?? 'updated',
    sortOrder: parsedFilters.sortOrder ?? 'desc'
  };

  const overview = await getProjectsOverview(session.userId, mergedFilters);

  return (
    <ProjectsOverviewPageClient
      initialFilters={mergedFilters}
      initialData={overview}
      currentUserId={session.userId}
    />
  );
}

