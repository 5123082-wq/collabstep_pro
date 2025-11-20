import { memory, DEFAULT_ACCOUNT_ID, DEFAULT_WORKSPACE_ID } from '../data/memory';
import type { WorkspaceUser } from '../types';
import type { UsersRepository } from './users-repository.interface';
import { UsersDbRepository } from './users-db-repository';

function cloneUser(user: WorkspaceUser): WorkspaceUser {
  return { ...user };
}

export class UsersMemoryRepository implements UsersRepository {
  async list(): Promise<WorkspaceUser[]> {
    return memory.WORKSPACE_USERS.map(cloneUser);
  }

  async findById(id: string): Promise<WorkspaceUser | null> {
    if (!id) {
      return null;
    }
    const trimmed = id.trim();
    if (!trimmed) {
      return null;
    }
    const lower = trimmed.toLowerCase();
    const match = memory.WORKSPACE_USERS.find(
      (user) => user.id === trimmed || user.email.toLowerCase() === lower
    );
    return match ? cloneUser(match) : null;
  }

  async findMany(ids: string[]): Promise<WorkspaceUser[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }
    const lookup = new Set(ids.map((value) => value.trim()).filter(Boolean));
    if (lookup.size === 0) {
      return [];
    }
    return memory.WORKSPACE_USERS.filter((user) => lookup.has(user.id)).map(cloneUser);
  }

  async findByEmail(email: string): Promise<WorkspaceUser | null> {
    if (!email) {
      return null;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return null;
    }
    const match = memory.WORKSPACE_USERS.find((user) => user.email.toLowerCase() === trimmed);
    return match ? cloneUser(match) : null;
  }

  async updatePassword(email: string, passwordHash: string): Promise<boolean> {
    if (!email || !passwordHash) {
      return false;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    const userIndex = memory.WORKSPACE_USERS.findIndex((user) => user.email.toLowerCase() === trimmed);
    if (userIndex < 0) {
      return false;
    }
    const existingUser = memory.WORKSPACE_USERS[userIndex];
    if (existingUser) {
      memory.WORKSPACE_USERS[userIndex] = {
        ...existingUser,
        passwordHash
      };
    }
    return true;
  }

  async create(user: Omit<WorkspaceUser, 'id'> & { id?: string; passwordHash?: string }): Promise<WorkspaceUser> {
    const email = user.email.trim().toLowerCase();
    const existing = memory.WORKSPACE_USERS.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      return cloneUser(existing);
    }

    // Генерируем UUID для нового пользователя, если ID не предоставлен
    const newUser: WorkspaceUser = {
      id: user.id || crypto.randomUUID(),
      name: user.name.trim(),
      email: user.email.trim(),
      ...(user.title && { title: user.title }),
      ...(user.avatarUrl && { avatarUrl: user.avatarUrl }),
      ...(user.department && { department: user.department }),
      ...(user.location && { location: user.location }),
      ...(user.passwordHash && { passwordHash: user.passwordHash })
    };

    memory.WORKSPACE_USERS.push(newUser);

    // Добавляем пользователя в ACCOUNT_MEMBERS как member
    const existingAccountMember = memory.ACCOUNT_MEMBERS.find(
      (member) => member.userId === newUser.id && member.accountId === DEFAULT_ACCOUNT_ID
    );
    if (!existingAccountMember) {
      memory.ACCOUNT_MEMBERS.push({
        accountId: DEFAULT_ACCOUNT_ID,
        userId: newUser.id,
        role: 'member'
      });
    }

    // Добавляем пользователя в WORKSPACE_MEMBERS как member
    const workspaceMembers = memory.WORKSPACE_MEMBERS[DEFAULT_WORKSPACE_ID] || [];
    const existingWorkspaceMember = workspaceMembers.find((member) => member.userId === newUser.id);
    if (!existingWorkspaceMember) {
      if (!memory.WORKSPACE_MEMBERS[DEFAULT_WORKSPACE_ID]) {
        memory.WORKSPACE_MEMBERS[DEFAULT_WORKSPACE_ID] = [];
      }
      memory.WORKSPACE_MEMBERS[DEFAULT_WORKSPACE_ID].push({
        workspaceId: DEFAULT_WORKSPACE_ID,
        userId: newUser.id,
        role: 'member'
      });
    }

    return cloneUser(newUser);
  }

  async delete(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }
    const trimmed = userId.trim();
    if (!trimmed) {
      return false;
    }

    const userIndex = memory.WORKSPACE_USERS.findIndex(
      (user) => user.id === trimmed || user.email.toLowerCase() === trimmed.toLowerCase()
    );

    if (userIndex < 0) {
      return false;
    }

    // Удаляем пользователя из WORKSPACE_USERS
    memory.WORKSPACE_USERS.splice(userIndex, 1);

    // Удаляем из ACCOUNT_MEMBERS
    memory.ACCOUNT_MEMBERS = memory.ACCOUNT_MEMBERS.filter(
      (member) => member.userId !== trimmed
    );

    // Удаляем из WORKSPACE_MEMBERS
    for (const workspaceId in memory.WORKSPACE_MEMBERS) {
      const members = memory.WORKSPACE_MEMBERS[workspaceId];
      if (members) {
        memory.WORKSPACE_MEMBERS[workspaceId] = members.filter(
          (member) => member.userId !== trimmed
        );
      }
    }

    return true;
  }
}

// Factory logic
const isDbStorage = process.env.AUTH_STORAGE === 'db';
export const usersRepository: UsersRepository = isDbStorage ? new UsersDbRepository() : new UsersMemoryRepository();
export type { UsersRepository };
