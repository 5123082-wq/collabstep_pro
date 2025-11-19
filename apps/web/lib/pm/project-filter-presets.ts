import type { ProjectListFilters } from './filters';

export type ProjectFilterSnapshot = Omit<ProjectListFilters, 'page'>;

export type ProjectFilterPreset = {
  id: string;
  name: string;
  filters: ProjectFilterSnapshot;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'projects_overview_presets';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage(): ProjectFilterPreset[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ProjectFilterPreset[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load project filter presets', error);
    return [];
  }
}

function writeStorage(presets: ProjectFilterPreset[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to persist project filter presets', error);
  }
}

export function loadProjectFilterPresets(): ProjectFilterPreset[] {
  return readStorage().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function saveProjectFilterPreset(
  preset: Omit<ProjectFilterPreset, 'id' | 'createdAt' | 'updatedAt'>
): ProjectFilterPreset {
  const presets = readStorage();
  const now = new Date().toISOString();
  const newPreset: ProjectFilterPreset = {
    ...preset,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  presets.push(newPreset);
  writeStorage(presets);
  return newPreset;
}

export function updateProjectFilterPreset(
  id: string,
  updates: Partial<Omit<ProjectFilterPreset, 'id' | 'createdAt'>>
): ProjectFilterPreset | null {
  const presets = readStorage();
  const index = presets.findIndex((preset) => preset.id === id);
  if (index === -1) {
    return null;
  }
  const current = presets[index];
  if (!current) {
    return null;
  }
  const updated: ProjectFilterPreset = {
    ...current,
    ...updates,
    filters: updates.filters ? { ...current.filters, ...updates.filters } : current.filters,
    updatedAt: new Date().toISOString()
  };
  presets[index] = updated;
  writeStorage(presets);
  return updated;
}

export function deleteProjectFilterPreset(id: string): boolean {
  const presets = readStorage();
  const filtered = presets.filter((preset) => preset.id !== id);
  if (filtered.length === presets.length) {
    return false;
  }
  writeStorage(filtered);
  return true;
}


