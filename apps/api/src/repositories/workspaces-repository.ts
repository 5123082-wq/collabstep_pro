import { memory } from '../data/memory';
import type { ProjectVisibility, Workspace, WorkspaceMember } from '../types';

type CreateWorkspacePayload = {
  id?: string;
  accountId: string;
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
};

type UpdateWorkspacePatch = Partial<Pick<Workspace, 'name' | 'description' | 'visibility' | 'archived'>>;

function cloneWorkspace(workspace: Workspace): Workspace {
  return { ...workspace };
}

function cloneMember(member: WorkspaceMember): WorkspaceMember {
  return { ...member };
}

export class WorkspacesRepository {
  list(): Workspace[] {
    return memory.WORKSPACES.map(cloneWorkspace);
  }

  findById(id: string): Workspace | null {
    const workspace = memory.WORKSPACES.find((item) => item.id === id);
    return workspace ? cloneWorkspace(workspace) : null;
  }

  listMembers(workspaceId: string): WorkspaceMember[] {
    return (memory.WORKSPACE_MEMBERS[workspaceId] ?? []).map(cloneMember);
  }

  create(payload: CreateWorkspacePayload): Workspace {
    const now = new Date().toISOString();
    const workspaceId =
      typeof payload.id === 'string' && payload.id.trim().length > 0
        ? payload.id.trim()
        : crypto.randomUUID();
    const existing = memory.WORKSPACES.find((item) => item.id === workspaceId);
    if (existing) {
      return cloneWorkspace(existing);
    }
    const workspace: Workspace = {
      id: workspaceId,
      accountId: payload.accountId,
      name: payload.name.trim(),
      visibility: payload.visibility === 'public' ? 'public' : 'private',
      archived: false,
      createdAt: now,
      updatedAt: now
    };
    const description = payload.description?.trim();
    if (description) {
      workspace.description = description;
    }
    memory.WORKSPACES.push(workspace);
    memory.WORKSPACE_MEMBERS[workspace.id] = [];
    return cloneWorkspace(workspace);
  }

  update(id: string, patch: UpdateWorkspacePatch): Workspace | null {
    const index = memory.WORKSPACES.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const current = memory.WORKSPACES[index];
    if (!current) {
      return null;
    }
    const next: Workspace = {
      ...current,
      updatedAt: new Date().toISOString()
    };
    if (typeof patch.name === 'string' && patch.name.trim()) {
      next.name = patch.name.trim();
    }
    if (typeof patch.description === 'string') {
      const trimmed = patch.description.trim();
      if (trimmed) {
        next.description = trimmed;
      } else {
        delete next.description;
      }
    }
    if (typeof patch.visibility === 'string') {
      next.visibility = patch.visibility === 'public' ? 'public' : 'private';
    }
    if (typeof patch.archived === 'boolean') {
      next.archived = patch.archived;
    }
    memory.WORKSPACES[index] = next;
    return cloneWorkspace(next);
  }

  delete(id: string): boolean {
    const index = memory.WORKSPACES.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }
    const [workspace] = memory.WORKSPACES.splice(index, 1);
    if (workspace) {
      delete memory.WORKSPACE_MEMBERS[workspace.id];
    }
    return true;
  }

  upsertMember(workspaceId: string, userId: string, role: WorkspaceMember['role']): WorkspaceMember {
    const members = memory.WORKSPACE_MEMBERS[workspaceId] ?? [];
    const index = members.findIndex((item) => item.userId === userId);
    const member: WorkspaceMember = { workspaceId, userId, role };
    if (index === -1) {
      members.push(member);
    } else {
      members[index] = member;
    }
    memory.WORKSPACE_MEMBERS[workspaceId] = members;
    return cloneMember(member);
  }

  removeMember(workspaceId: string, userId: string): boolean {
    const members = memory.WORKSPACE_MEMBERS[workspaceId];
    if (!members) {
      return false;
    }
    const index = members.findIndex((item) => item.userId === userId);
    if (index === -1) {
      return false;
    }
    members.splice(index, 1);
    return true;
  }
}

export const workspacesRepository = new WorkspacesRepository();
