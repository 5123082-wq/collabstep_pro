import { adminPlatformRepository } from '../repositories/admin-platform-repository';
import { usersRepository } from '../repositories/users-repository';
import type {
  ID,
  PlatformAudience,
  PlatformModuleNode,
  PlatformModuleStatus,
  PlatformRole,
  PlatformUserControl,
  PlatformUserStatus,
  WorkspaceUser
} from '../types';

export interface ModuleNodeView extends PlatformModuleNode {
  testersDetails: WorkspaceUser[];
  children?: ModuleNodeView[];
}

export interface AdminUserView {
  user: WorkspaceUser;
  control: PlatformUserControl;
  testerModules: { id: ID; label: string }[];
}

function toMap<T extends { id: ID }>(items: T[]): Map<ID, T> {
  return new Map(items.map((item) => [item.id, item]));
}

async function computeModuleTree(): Promise<ModuleNodeView[]> {
  const tree = adminPlatformRepository.listModuleTree();
  const users = await usersRepository.list();
  const userMap = toMap(users);

  const decorate = (nodes: PlatformModuleNode[], parentStatus: PlatformModuleStatus): ModuleNodeView[] =>
    nodes.map((node) => {
      const effectiveStatus: PlatformModuleStatus =
        parentStatus === 'disabled' || node.status === 'disabled' ? 'disabled' : 'enabled';
      const inherited = node.status === 'enabled' && parentStatus === 'disabled';
      const testersDetails = node.testers
        .map((testerId) => userMap.get(testerId))
        .filter((value): value is WorkspaceUser => Boolean(value));

      const { children, ...rest } = node;
      const decorated: ModuleNodeView = {
        ...rest,
        effectiveStatus,
        inherited,
        testersDetails
      };

      if (children && children.length > 0) {
        decorated.children = decorate(children, effectiveStatus);
      }

      return decorated;
    });

  return decorate(tree, 'enabled');
}

function sanitizeAudience(audience?: PlatformAudience): PlatformAudience | undefined {
  if (!audience) {
    return undefined;
  }
  if (audience === 'everyone' || audience === 'admins' || audience === 'beta') {
    return audience;
  }
  return undefined;
}

function filterExistingUsers(userIds: ID[]): ID[] {
  if (!Array.isArray(userIds)) {
    return [];
  }
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) {
    return [];
  }
  const users = usersRepository.findMany(unique);
  const existingIds = new Set(users.map((user) => user.id));
  return unique.filter((id) => existingIds.has(id));
}

function syncModuleTestersWithControls(moduleId: ID, testers: ID[], actorId: ID): void {
  const controls = adminPlatformRepository.listUserControls();
  const current = new Set(testers);

  controls.forEach((control) => {
    const hasAccess = control.testerAccess.includes(moduleId);
    if (hasAccess && !current.has(control.userId)) {
      const nextAccess = control.testerAccess.filter((value) => value !== moduleId);
      adminPlatformRepository.upsertUserControl(control.userId, { testerAccess: nextAccess }, actorId);
    }
  });

  testers.forEach((testerId) => {
    const existing = adminPlatformRepository.getUserControl(testerId);
    const accessSet = new Set(existing?.testerAccess ?? []);
    if (!accessSet.has(moduleId)) {
      accessSet.add(moduleId);
      adminPlatformRepository.upsertUserControl(testerId, { testerAccess: Array.from(accessSet) }, actorId);
    }
  });
}

function syncControlTesterAssignments(userId: ID, testerAccess: ID[], actorId: ID): void {
  const modules = adminPlatformRepository.getFlatModules();
  const target = new Set(testerAccess);

  modules.forEach((module) => {
    const testers = new Set(module.testers);
    const has = testers.has(userId);
    const shouldHave = target.has(module.id);

    if (has && !shouldHave) {
      testers.delete(userId);
      adminPlatformRepository.updateModuleDefaults(module.id, { testers: Array.from(testers) }, actorId);
    } else if (!has && shouldHave) {
      testers.add(userId);
      adminPlatformRepository.updateModuleDefaults(module.id, { testers: Array.from(testers) }, actorId);
    }
  });
}

export async function getAdminModuleTree(): Promise<ModuleNodeView[]> {
  return computeModuleTree();
}

export async function setModuleStatus(moduleId: ID, status: PlatformModuleStatus, actorId: ID): Promise<ModuleNodeView[]> {
  adminPlatformRepository.updateModuleStatus(moduleId, status, actorId);
  return computeModuleTree();
}

export async function updateModuleDefaults(
  moduleId: ID,
  values: { audience?: PlatformAudience; testers?: ID[]; summary?: string },
  actorId: ID
): Promise<ModuleNodeView[]> {
  const updates: Partial<Pick<PlatformModuleNode, 'defaultAudience' | 'testers' | 'summary'>> = {};
  const audience = sanitizeAudience(values.audience);
  if (audience) {
    updates.defaultAudience = audience;
  }
  if (Array.isArray(values.testers)) {
    const testers = filterExistingUsers(values.testers);
    updates.testers = testers;
  }
  if (typeof values.summary === 'string') {
    updates.summary = values.summary;
  }

  const result = adminPlatformRepository.updateModuleDefaults(moduleId, updates, actorId);
  if (updates.testers) {
    syncModuleTestersWithControls(moduleId, updates.testers, actorId);
  }

  return computeModuleTree();
}

export async function listAdminUsers(): Promise<AdminUserView[]> {
  const users = await usersRepository.list();
  const controls = adminPlatformRepository.listUserControls();
  const modules = adminPlatformRepository.getFlatModules();
  const controlsMap = new Map<ID, PlatformUserControl>(controls.map((item) => [item.userId, item]));
  const modulesMap = new Map<ID, { id: ID; label: string }>(
    modules.map((module) => [module.id, { id: module.id, label: module.label }])
  );

  return users.map((user) => {
    const control = controlsMap.get(user.id) ?? {
      userId: user.id,
      status: 'active',
      roles: ['viewer'],
      testerAccess: [],
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    const testerModules = control.testerAccess
      .map((moduleId) => modulesMap.get(moduleId))
      .filter((value): value is { id: ID; label: string } => Boolean(value));

    return {
      user,
      control,
      testerModules
    };
  });
}

type UserControlUpdates = {
  status?: PlatformUserStatus;
  roles?: PlatformRole[];
  testerAccess?: ID[];
  notes?: string;
};

export function updateUserControl(
  userId: ID,
  updates: UserControlUpdates,
  actorId: ID
): PlatformUserControl | null {
  const payload: Partial<PlatformUserControl> = {};
  if (updates.status === 'active' || updates.status === 'suspended' || updates.status === 'invited') {
    payload.status = updates.status;
  }

  if (Array.isArray(updates.roles)) {
    const filteredRoles = updates.roles.filter((role): role is PlatformRole => Boolean(role));
    payload.roles = Array.from(new Set(filteredRoles));
  }

  if (Array.isArray(updates.testerAccess)) {
    payload.testerAccess = filterExistingModules(updates.testerAccess);
  }

  if (typeof updates.notes === 'string') {
    payload.notes = updates.notes;
  }

  const control = adminPlatformRepository.upsertUserControl(userId, payload, actorId);

  if (payload.testerAccess) {
    syncControlTesterAssignments(userId, payload.testerAccess, actorId);
  }

  return control;
}

function filterExistingModules(moduleIds: ID[]): ID[] {
  const modules = adminPlatformRepository.getFlatModules();
  const valid = new Set(modules.map((module) => module.id));
  return Array.from(new Set(moduleIds.filter((id) => valid.has(id))));
}

