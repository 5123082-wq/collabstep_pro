/**
 * Утилита для определения текущего глобального раздела по pathname
 */

export type GlobalSectionId =
  | 'dashboard'
  | 'projects'
  | 'marketplace'
  | 'performers'
  | 'marketing'
  | 'ai-hub'
  | 'community'
  | 'finance'
  | 'docs'
  | 'org'
  | 'support'
  | 'admin';

/**
 * Определяет глобальный раздел на основе pathname
 */
export function detectSectionFromPath(pathname: string): GlobalSectionId | null {
  if (!pathname) {
    return null;
  }
  
  const normalized = pathname.split('?')[0] || ''; // Убираем query параметры
  
  if (normalized.startsWith('/dashboard') || normalized === '/') {
    return 'dashboard';
  }
  if (normalized.startsWith('/projects') || normalized.startsWith('/project')) {
    return 'projects';
  }
  if (normalized.startsWith('/market')) {
    return 'marketplace';
  }
  if (normalized.startsWith('/performers')) {
    return 'performers';
  }
  if (normalized.startsWith('/marketing')) {
    return 'marketing';
  }
  if (normalized.startsWith('/ai-hub')) {
    return 'ai-hub';
  }
  if (normalized.startsWith('/community')) {
    return 'community';
  }
  if (normalized.startsWith('/finance')) {
    return 'finance';
  }
  if (normalized.startsWith('/docs')) {
    return 'docs';
  }
  if (normalized.startsWith('/org')) {
    return 'org';
  }
  if (normalized.startsWith('/support')) {
    return 'support';
  }
  if (normalized.startsWith('/admin')) {
    return 'admin';
  }
  
  return null;
}

