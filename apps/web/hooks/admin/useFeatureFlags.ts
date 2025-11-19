import { isFeatureEnabled } from '@/lib/feature-flags';
import type { FeatureFlagKey } from '@/lib/feature-flags';

/**
 * Проверка включена ли фича (клиентский хук)
 * TODO: В будущем будет подключаться к бэкенду для динамических флагов
 */
export function useFeatureFlag(flagKey: string): boolean {
  try {
    return isFeatureEnabled(flagKey as FeatureFlagKey);
  } catch {
    return false;
  }
}

/**
 * Проверка включен ли раздел меню
 */
export function useMenuSectionEnabled(sectionId: string): boolean {
  const sectionToFeatureMap: Record<string, FeatureFlagKey> = {
    marketing: 'projectsCore',
    documents: 'projectCreateWizard',
    finance: 'budgetLimits',
    tasks: 'tasksWorkspace',
    ai: 'financeAutomations',
    pm: 'pmNavProjectsAndTasks'
  };

  const featureKey = sectionToFeatureMap[sectionId];
  // Always call hook unconditionally
  const marketingEnabled = useFeatureFlag('projectsCore');
  const documentsEnabled = useFeatureFlag('projectCreateWizard');
  const financeEnabled = useFeatureFlag('budgetLimits');
  const tasksEnabled = useFeatureFlag('tasksWorkspace');
  const aiEnabled = useFeatureFlag('financeAutomations');
  const pmEnabled = useFeatureFlag('pmNavProjectsAndTasks');
  
  const flagMap: Record<string, boolean> = {
    marketing: marketingEnabled,
    documents: documentsEnabled,
    finance: financeEnabled,
    tasks: tasksEnabled,
    ai: aiEnabled,
    pm: pmEnabled
  };
  
  return featureKey ? flagMap[sectionId] ?? true : true;
}

