import type { WorkspaceUser } from '../types';

export interface UsersRepository {
    list(): Promise<WorkspaceUser[]> | WorkspaceUser[];
    findById(id: string): Promise<WorkspaceUser | null> | WorkspaceUser | null;
    findMany(ids: string[]): Promise<WorkspaceUser[]> | WorkspaceUser[];
    findByEmail(email: string): Promise<WorkspaceUser | null> | WorkspaceUser | null;
    updatePassword(email: string, passwordHash: string): Promise<boolean> | boolean;
    create(user: Omit<WorkspaceUser, 'id'> & { id?: string; passwordHash?: string }): Promise<WorkspaceUser> | WorkspaceUser;
    delete(userId: string): Promise<boolean> | boolean;
}
