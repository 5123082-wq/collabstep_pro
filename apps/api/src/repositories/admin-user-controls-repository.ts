import { memory } from '../data/memory';
import type { PlatformRole, PlatformUserControl, PlatformUserStatus } from '../types';

const ALLOWED_STATUSES: PlatformUserStatus[] = ['active', 'suspended', 'invited'];
const ALLOWED_ROLES: PlatformRole[] = [
  'productAdmin',
  'featureAdmin',
  'supportAgent',
  'financeAdmin',
  'betaTester',
  'viewer'
];

function cloneControl(control: PlatformUserControl): PlatformUserControl {
  return {
    ...control,
    roles: [...control.roles],
    testerAccess: [...control.testerAccess]
  };
}

function normalizeStatus(value: unknown, fallback: PlatformUserStatus): PlatformUserStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const match = ALLOWED_STATUSES.find((item) => item === normalized);
    if (match) {
      return match;
    }
  }
  return fallback;
}

function normalizeRoles(value: unknown, fallback: PlatformRole[]): PlatformRole[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const unique = new Set<PlatformRole>();
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const normalized = item.trim().toLowerCase();
    const match = ALLOWED_ROLES.find((role) => role === normalized);
    if (match) {
      unique.add(match);
    }
  }

  if (unique.size === 0) {
    return [];
  }

  return Array.from(unique);
}

function normalizeTesterAccess(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
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

export class AdminUserControlsRepository {
  list(): PlatformUserControl[] {
    return memory.ADMIN_USER_CONTROLS.map(cloneControl);
  }

  findByUserId(userId: string): PlatformUserControl | null {
    const control = memory.ADMIN_USER_CONTROLS.find((item) => item.userId === userId);
    return control ? cloneControl(control) : null;
  }

  private ensureIndex(userId: string): number {
    const idx = memory.ADMIN_USER_CONTROLS.findIndex((item) => item.userId === userId);
    if (idx !== -1) {
      return idx;
    }
    const now = new Date().toISOString();
    memory.ADMIN_USER_CONTROLS.push({
      userId,
      status: 'active',
      roles: [],
      testerAccess: [],
      updatedAt: now,
      updatedBy: 'system'
    });
    return memory.ADMIN_USER_CONTROLS.length - 1;
  }

  upsert(control: PlatformUserControl): PlatformUserControl {
    const idx = this.ensureIndex(control.userId);
    memory.ADMIN_USER_CONTROLS[idx] = {
      ...control,
      roles: [...control.roles],
      testerAccess: [...control.testerAccess],
      updatedAt: control.updatedAt,
      updatedBy: control.updatedBy
    };
    return cloneControl(memory.ADMIN_USER_CONTROLS[idx]!);
  }

  update(
    userId: string,
    patch: Partial<Pick<PlatformUserControl, 'status' | 'roles' | 'testerAccess' | 'notes'>> & { updatedBy?: string }
  ): PlatformUserControl {
    const idx = this.ensureIndex(userId);
    const current = memory.ADMIN_USER_CONTROLS[idx]!;
    const next: PlatformUserControl = {
      ...current,
      updatedAt: new Date().toISOString(),
      updatedBy: patch.updatedBy ?? current.updatedBy
    };

    if ('status' in patch) {
      next.status = normalizeStatus(patch.status, current.status);
    }

    if ('roles' in patch) {
      next.roles = normalizeRoles(patch.roles, current.roles);
    }

    if ('testerAccess' in patch) {
      next.testerAccess = normalizeTesterAccess(patch.testerAccess, current.testerAccess);
    }

    if ('notes' in patch) {
      if (typeof patch.notes === 'string' && patch.notes.trim()) {
        next.notes = patch.notes.trim();
      } else {
        delete next.notes;
      }
    }

    memory.ADMIN_USER_CONTROLS[idx] = next;
    return cloneControl(next);
  }

  delete(userId: string): boolean {
    const idx = memory.ADMIN_USER_CONTROLS.findIndex((item) => item.userId === userId);
    if (idx === -1) {
      return false;
    }
    memory.ADMIN_USER_CONTROLS.splice(idx, 1);
    return true;
  }
}

export const adminUserControlsRepository = new AdminUserControlsRepository();

