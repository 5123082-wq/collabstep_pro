import { memory } from '../data/memory';
import { adminModulesRepository } from '../repositories/admin-modules-repository';
import { adminUserControlsRepository } from '../repositories/admin-user-controls-repository';
import { usersRepository } from '../repositories/users-repository';
import type {
  PlatformAudience,
  PlatformModule,
  PlatformModuleStatus,
  PlatformRole,
  PlatformUserControl,
  PlatformUserStatus,
  WorkspaceUser
} from '../types';

export interface AdminModuleTester {
  userId: string;
  name: string;
  email?: string;
  status: PlatformUserStatus;
  roles: PlatformRole[];
  notes?: string;
}

export interface AdminModuleNodeView {
  id: string;
  parentId: string | null;
  code: string;
  label: string;
  summary?: string;
  path?: string;
  status: PlatformModuleStatus;
  effectiveStatus: PlatformModuleStatus;
  inherited: boolean;
  defaultAudience: PlatformAudience;
  tags: string[];
  testerIds: string[];
  testers: AdminModuleTester[];
  updatedAt: string;
  updatedBy: string;
  children: AdminModuleNodeView[];
}

export interface AdminUserView {
  userId: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
  location?: string;
  status: PlatformUserStatus;
  roles: PlatformRole[];
  testerAccess: string[];
  testerModules: {
    id: string;
    code: string;
    label: string;
    status: PlatformModuleStatus;
    effectiveStatus: PlatformModuleStatus;
  }[];
  notes?: string;
  updatedAt: string;
  updatedBy: string;
  isAI?: boolean; // Флаг для AI-агентов
}

export class AdminService {
  private getWorkspaceUserMap(): Map<string, WorkspaceUser> {
    const users = memory.WORKSPACE_USERS || [];
    return new Map(users.map((user) => [user.id, user]));
  }

  private getUserControlsMap(): Map<string, PlatformUserControl> {
    return new Map(adminUserControlsRepository.list().map((control) => [control.userId, control]));
  }

  private decorateTester(userId: string, controlsMap: Map<string, PlatformUserControl>, usersMap: Map<string, WorkspaceUser>): AdminModuleTester {
    const control = controlsMap.get(userId);
    const user = usersMap.get(userId);
    const result: AdminModuleTester = {
      userId,
      name: user?.name ?? userId,
      status: control?.status ?? 'active',
      roles: control?.roles ?? [],
    };
    
    if (user?.email) {
      result.email = user.email;
    }
    
    if (control?.notes) {
      result.notes = control.notes;
    }
    
    return result;
  }

  private buildModuleViewTree(): AdminModuleNodeView[] {
    const usersMap = this.getWorkspaceUserMap();
    const controlsMap = this.getUserControlsMap();
    const tree = adminModulesRepository.buildTree();

    const hydrate = (
      node: ReturnType<typeof adminModulesRepository.buildTree>[number],
      inheritedStatus: PlatformModuleStatus
    ): AdminModuleNodeView => {
      const testerIds = [...node.testers];
      const testers = testerIds
        .map((testerId) => this.decorateTester(testerId, controlsMap, usersMap))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      const effectiveStatus: PlatformModuleStatus = inheritedStatus === 'disabled' ? 'disabled' : node.status;
      const inherited = inheritedStatus === 'disabled';
      const result: AdminModuleNodeView = {
        id: node.id,
        parentId: node.parentId,
        code: node.code,
        label: node.label,
        status: node.status,
        effectiveStatus,
        inherited,
        defaultAudience: node.defaultAudience,
        tags: [...node.tags],
        testerIds,
        testers,
        updatedAt: node.updatedAt,
        updatedBy: node.updatedBy,
        children: (node.children ?? []).map((child) => hydrate(child, effectiveStatus))
      };
      
      if (node.summary) {
        result.summary = node.summary;
      }
      
      if (node.path) {
        result.path = node.path;
      }
      
      return result;
    };

    return tree.map((node) => hydrate(node, 'enabled'));
  }

  private flattenModuleViews(modules: AdminModuleNodeView[]): Map<string, AdminModuleNodeView> {
    const map = new Map<string, AdminModuleNodeView>();
    const stack: AdminModuleNodeView[] = [...modules];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      map.set(current.id, current);
      if (current.children.length > 0) {
        stack.push(...current.children);
      }
    }
    return map;
  }

  getModuleTree(): AdminModuleNodeView[] {
    return this.buildModuleViewTree();
  }

  getModuleById(moduleId: string): AdminModuleNodeView | null {
    const tree = this.buildModuleViewTree();
    const map = this.flattenModuleViews(tree);
    return map.get(moduleId) ?? null;
  }

  updateModule(
    moduleId: string,
    patch: Partial<Pick<PlatformModule, 'status' | 'defaultAudience' | 'label' | 'summary' | 'path' | 'tags'>> & {
      testers?: string[];
    },
    actorId: string
  ): AdminModuleNodeView | null {
    const normalizedTesters = Array.isArray(patch.testers)
      ? Array.from(
          new Set(
            patch.testers
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          )
        )
      : undefined;

    // Filter out undefined values for exactOptionalPropertyTypes
    const cleanPatch: Partial<Pick<PlatformModule, 'status' | 'defaultAudience' | 'label' | 'summary' | 'path' | 'tags'>> & { testers?: string[] } = {};
    if (patch.status !== undefined) {
      cleanPatch.status = patch.status;
    }
    if (patch.defaultAudience !== undefined) {
      cleanPatch.defaultAudience = patch.defaultAudience;
    }
    if (patch.label !== undefined) {
      cleanPatch.label = patch.label;
    }
    if (patch.summary !== undefined) {
      cleanPatch.summary = patch.summary;
    }
    if (patch.path !== undefined) {
      cleanPatch.path = patch.path;
    }
    if (patch.tags !== undefined) {
      cleanPatch.tags = patch.tags;
    }

    const updated = adminModulesRepository.update(moduleId, {
      ...cleanPatch,
      ...(normalizedTesters ? { testers: normalizedTesters } : {}),
      updatedBy: actorId
    });

    if (!updated) {
      return null;
    }

    if (normalizedTesters) {
      this.syncUserControlsForModule(moduleId, normalizedTesters, actorId);
    }

    return this.getModuleById(moduleId);
  }

  listUsers(): AdminUserView[] {
    const modules = this.buildModuleViewTree();
    const moduleMap = this.flattenModuleViews(modules);
    const usersMap = this.getWorkspaceUserMap();
    const controlsMap = this.getUserControlsMap();

    const userIds = new Set<string>([
      ...Array.from(usersMap.keys()),
      ...Array.from(controlsMap.keys())
    ]);

    const views: AdminUserView[] = [];
    for (const userId of userIds) {
      const user = usersMap.get(userId);
      const control = controlsMap.get(userId) ?? {
        userId,
        status: 'active' as PlatformUserStatus,
        roles: [],
        testerAccess: [],
        updatedAt: new Date(0).toISOString(),
        updatedBy: 'system'
      };
      const testerModules = control.testerAccess
        .map((moduleId) => moduleMap.get(moduleId))
        .filter((item): item is AdminModuleNodeView => Boolean(item))
        .map((module) => ({
          id: module.id,
          code: module.code,
          label: module.label,
          status: module.status,
          effectiveStatus: module.effectiveStatus
        }));

      // Получаем имя пользователя, если его нет - используем email или "Без имени"
      const getUserDisplayName = (): string => {
        if (user?.name) {
          return user.name;
        }
        if (user?.email) {
          // Используем часть email до @ как имя
          const emailPart = user.email.split('@')[0];
          return emailPart || 'Без имени';
        }
        return 'Без имени';
      };

      const view: AdminUserView = {
        userId,
        name: getUserDisplayName(),
        status: control.status,
        roles: [...control.roles],
        testerAccess: [...control.testerAccess],
        testerModules,
        updatedAt: control.updatedAt,
        updatedBy: control.updatedBy
      };
      
      if (user?.email) {
        view.email = user.email;
      }
      
      if (user?.title) {
        view.title = user.title;
      }
      
      if (user?.department) {
        view.department = user.department;
      }
      
      if (user?.location) {
        view.location = user.location;
      }
      
      if (control.notes) {
        view.notes = control.notes;
      }
      
      // Добавляем флаг isAI, если пользователь является AI-агентом
      if (user?.isAI) {
        view.isAI = true;
      }
      
      views.push(view);
    }

    return views.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  getUser(userId: string): AdminUserView | null {
    const users = this.listUsers();
    return users.find((item) => item.userId === userId) ?? null;
  }

  updateUser(
    userId: string,
    patch: Partial<Pick<PlatformUserControl, 'status' | 'roles' | 'testerAccess' | 'notes'>>,
    actorId: string
  ): AdminUserView {
    // Filter out undefined values for exactOptionalPropertyTypes
    const cleanPatch: Partial<Pick<PlatformUserControl, 'status' | 'roles' | 'testerAccess' | 'notes'>> = {};
    if (patch.status !== undefined) {
      cleanPatch.status = patch.status;
    }
    if (patch.roles !== undefined) {
      cleanPatch.roles = patch.roles;
    }
    if (patch.testerAccess !== undefined) {
      cleanPatch.testerAccess = patch.testerAccess;
    }
    if (patch.notes !== undefined) {
      cleanPatch.notes = patch.notes;
    }

    adminUserControlsRepository.update(userId, {
      ...cleanPatch,
      updatedBy: actorId
    });

    if ('testerAccess' in patch) {
      this.syncModulesFromUserControls(actorId);
    }

    return this.getUser(userId)!;
  }

  deleteUser(userId: string): boolean {
    // Удаляем из ADMIN_USER_CONTROLS
    const controlDeleted = adminUserControlsRepository.delete(userId);
    
    // Удаляем из WORKSPACE_USERS (может не существовать для сиротских записей)
    const userDeleted = usersRepository.delete(userId);
    
    // Если была удалена запись из ADMIN_USER_CONTROLS, синхронизируем модули
    // чтобы удалить назначения тестеров из модулей
    if (controlDeleted) {
      this.syncModulesFromUserControls('system');
    }
    
    // Возвращаем true, если была удалена хотя бы одна запись
    return controlDeleted || userDeleted;
  }

  private syncUserControlsForModule(moduleId: string, testers: string[], actorId: string): void {
    const controls = adminUserControlsRepository.list();
    const controlsMap = new Map(controls.map((item) => [item.userId, item]));
    const testerSet = new Set(testers);

    for (const control of controls) {
      const shouldHave = testerSet.has(control.userId);
      const hasAccess = control.testerAccess.includes(moduleId);

      if (shouldHave) {
        testerSet.delete(control.userId);
      }

      if (shouldHave && !hasAccess) {
        const nextAccess = Array.from(new Set([...control.testerAccess, moduleId]));
        adminUserControlsRepository.update(control.userId, {
          testerAccess: nextAccess,
          updatedBy: actorId
        });
      }

      if (!shouldHave && hasAccess) {
        const nextAccess = control.testerAccess.filter((item) => item !== moduleId);
        adminUserControlsRepository.update(control.userId, {
          testerAccess: nextAccess,
          updatedBy: actorId
        });
      }
    }

    for (const remaining of testerSet) {
      const existing = controlsMap.get(remaining);
      if (existing) {
        const nextAccess = Array.from(new Set([...existing.testerAccess, moduleId]));
        adminUserControlsRepository.update(remaining, {
          testerAccess: nextAccess,
          updatedBy: actorId
        });
      } else {
        adminUserControlsRepository.update(remaining, {
          status: 'active',
          roles: ['betaTester'],
          testerAccess: [moduleId],
          updatedBy: actorId
        });
      }
    }
  }

  private syncModulesFromUserControls(actorId: string): void {
    const controls = adminUserControlsRepository.list();
    const desired = new Map<string, Set<string>>();

    for (const control of controls) {
      for (const moduleId of control.testerAccess) {
        if (!desired.has(moduleId)) {
          desired.set(moduleId, new Set());
        }
        desired.get(moduleId)!.add(control.userId);
      }
    }

    const modules = adminModulesRepository.list();
    for (const moduleItem of modules) {
      const targetSet = desired.get(moduleItem.id) ?? new Set<string>();
      const currentSet = new Set(moduleItem.testers);
      let changed = false;
      if (currentSet.size !== targetSet.size) {
        changed = true;
      } else {
        for (const tester of currentSet) {
          if (!targetSet.has(tester)) {
            changed = true;
            break;
          }
        }
      }
      if (changed) {
        adminModulesRepository.replaceTesters(moduleItem.id, Array.from(targetSet), actorId);
      }
    }
  }
}

export const adminService = new AdminService();

