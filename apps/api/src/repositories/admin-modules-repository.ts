import { memory } from '../data/memory';
import type {
  PlatformAudience,
  PlatformModule,
  PlatformModuleNode,
  PlatformModuleStatus
} from '../types';

const ALLOWED_STATUSES: PlatformModuleStatus[] = ['enabled', 'disabled'];
const ALLOWED_AUDIENCES: PlatformAudience[] = ['everyone', 'admins', 'beta'];

function cloneModule(module: PlatformModule): PlatformModule {
  return {
    ...module,
    testers: [...module.testers],
    tags: [...module.tags]
  };
}

function normalizeStatus(value: unknown, fallback: PlatformModuleStatus): PlatformModuleStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const match = ALLOWED_STATUSES.find((item) => item === normalized);
    if (match) {
      return match;
    }
  }
  return fallback;
}

function normalizeAudience(value: unknown, fallback: PlatformAudience): PlatformAudience {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const match = ALLOWED_AUDIENCES.find((item) => item === normalized);
    if (match) {
      return match;
    }
  }
  return fallback;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string') {
      const normalized = item.trim();
      if (normalized) {
        unique.add(normalized);
      }
    }
  }
  return Array.from(unique);
}

export class AdminModulesRepository {
  list(): PlatformModule[] {
    return memory.ADMIN_PLATFORM_MODULES.map(cloneModule);
  }

  findById(id: string): PlatformModule | null {
    const moduleItem = memory.ADMIN_PLATFORM_MODULES.find((item) => item.id === id);
    return moduleItem ? cloneModule(moduleItem) : null;
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        PlatformModule,
        'status' | 'defaultAudience' | 'label' | 'summary' | 'path' | 'tags' | 'testers' | 'sortOrder'
      >
    > & { updatedBy?: string }
  ): PlatformModule | null {
    const idx = memory.ADMIN_PLATFORM_MODULES.findIndex((item) => item.id === id);
    if (idx === -1) {
      return null;
    }

    const current = memory.ADMIN_PLATFORM_MODULES[idx];
    if (!current) {
      return null;
    }

    const next: PlatformModule = {
      ...current,
      updatedAt: new Date().toISOString(),
      updatedBy: patch.updatedBy ?? current.updatedBy
    };

    if ('status' in patch) {
      next.status = normalizeStatus(patch.status, current.status);
    }

    if ('defaultAudience' in patch) {
      next.defaultAudience = normalizeAudience(patch.defaultAudience, current.defaultAudience);
    }

    if (typeof patch.label === 'string' && patch.label.trim()) {
      next.label = patch.label.trim();
    }

    if (typeof patch.summary === 'string' && patch.summary.trim()) {
      next.summary = patch.summary.trim();
    }

    if (typeof patch.path === 'string' && patch.path.trim()) {
      next.path = patch.path.trim();
    }

    if ('sortOrder' in patch && typeof patch.sortOrder === 'number' && Number.isFinite(patch.sortOrder)) {
      next.sortOrder = patch.sortOrder;
    }

    if ('tags' in patch) {
      const normalizedTags = normalizeStringArray(patch.tags) ?? current.tags;
      next.tags = normalizedTags;
    }

    if ('testers' in patch) {
      const normalizedTesters = normalizeStringArray(patch.testers) ?? current.testers;
      next.testers = normalizedTesters;
    }

    memory.ADMIN_PLATFORM_MODULES[idx] = next;
    return cloneModule(next);
  }

  replaceTesters(id: string, testers: string[], updatedBy?: string): PlatformModule | null {
    return this.update(id, updatedBy ? { testers, updatedBy } : { testers });
  }

  buildTree(): PlatformModuleNode[] {
    const modules = this.list();
    const map = new Map<string, PlatformModuleNode>();
    for (const moduleItem of modules) {
      map.set(moduleItem.id, {
        ...moduleItem,
        testers: [...moduleItem.testers],
        tags: [...moduleItem.tags],
        children: []
      });
    }

    const roots: PlatformModuleNode[] = [];
    for (const moduleItem of modules) {
      const node = map.get(moduleItem.id);
      if (!node) {
        continue;
      }
      if (moduleItem.parentId && map.has(moduleItem.parentId)) {
        const parent = map.get(moduleItem.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (items: PlatformModuleNode[]) => {
      items.sort((a, b) => {
        if (a.sortOrder === b.sortOrder) {
          return a.label.localeCompare(b.label, 'ru');
        }
        return a.sortOrder - b.sortOrder;
      });
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          sortNodes(item.children);
        }
      }
    };

    sortNodes(roots);
    return roots;
  }
}

export const adminModulesRepository = new AdminModulesRepository();

