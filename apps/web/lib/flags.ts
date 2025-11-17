import { isFeatureEnabled } from '@/lib/feature-flags';

function resolveLegacyBooleanFlag(keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
      }
      return fallback;
    }
  }

  return fallback;
}

export const flags = {
  PROJECTS_V1: isFeatureEnabled('projectsCore'),
  PROJECTS_VIEWS: isFeatureEnabled('projectsOverview'),
  AI_V1: resolveLegacyBooleanFlag(['NEXT_PUBLIC_FEATURE_AI_V1', 'FEATURE_AI_V1']),
  MARKETPLACE_ATTACH: resolveLegacyBooleanFlag(['NEXT_PUBLIC_FEATURE_MARKETPLACE_ATTACH', 'FEATURE_MARKETPLACE_ATTACH']),
  PROJECTS_OVERVIEW: isFeatureEnabled('projectsOverview'),
  PROJECT_CREATE_WIZARD: isFeatureEnabled('projectCreateWizard'),
  PROJECT_DASHBOARD: isFeatureEnabled('projectDashboard'),
  TASKS_WORKSPACE: isFeatureEnabled('tasksWorkspace'),
  BUDGET_LIMITS: isFeatureEnabled('budgetLimits'),
  FINANCE_AUTOMATIONS: isFeatureEnabled('financeAutomations'),
  FINANCE_GLOBAL: isFeatureEnabled('financeGlobal'),
  PROJECT_ACTIVITY_AUDIT: isFeatureEnabled('projectActivityAudit'),
  TASK_TIME_TRACKING: isFeatureEnabled('taskTimeTracking'),
  PROJECT_ATTACHMENTS: resolveLegacyBooleanFlag([
    'NEXT_PUBLIC_FEATURE_PROJECT_ATTACHMENTS',
    'FEATURE_PROJECT_ATTACHMENTS'
  ]),
  PM_NAV_PROJECTS_AND_TASKS: isFeatureEnabled('pmNavProjectsAndTasks'),
  PM_PROJECTS_LIST: isFeatureEnabled('pmProjectsList'),
  PM_PROJECT_CARD: isFeatureEnabled('pmProjectCard'),
  PM_TASKS_BOARD: isFeatureEnabled('pmTasksBoard'),
  PM_TASKS_LIST: isFeatureEnabled('pmTasksList'),
  PM_TASKS_CALENDAR: isFeatureEnabled('pmTasksCalendar'),
  PM_DASHBOARD: isFeatureEnabled('pmDashboard'),
  PM_ARCHIVE: isFeatureEnabled('pmArchive')
} as const;

export type FlagName = keyof typeof flags;
