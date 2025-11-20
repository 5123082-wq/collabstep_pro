import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/config';
import { users, userControls } from '../db/schema';
import type { WorkspaceUser } from '../types';
import { DEFAULT_ACCOUNT_ID, DEFAULT_WORKSPACE_ID } from '../data/memory';

import type { UsersRepository } from './users-repository.interface';

export class UsersDbRepository implements UsersRepository {
    async list(): Promise<WorkspaceUser[]> {
        const dbUsers = await db.select().from(users);
        return dbUsers.map(this.mapToWorkspaceUser);
    }

    async findById(id: string): Promise<WorkspaceUser | null> {
        if (!id) return null;
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user ? this.mapToWorkspaceUser(user) : null;
    }

    async findMany(ids: string[]): Promise<WorkspaceUser[]> {
        if (!ids.length) return [];
        const dbUsers = await db.select().from(users).where(inArray(users.id, ids));
        return dbUsers.map(this.mapToWorkspaceUser);
    }

    async findByEmail(email: string): Promise<WorkspaceUser | null> {
        if (!email) return null;
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user ? this.mapToWorkspaceUser(user) : null;
    }

    async updatePassword(email: string, passwordHash: string): Promise<boolean> {
        if (!email) return false;
        const result = await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(users.email, email))
            .returning();
        return result.length > 0;
    }

    async create(user: Omit<WorkspaceUser, 'id'> & { id?: string; passwordHash?: string }): Promise<WorkspaceUser> {
        const newUser = {
            id: user.id || crypto.randomUUID(),
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
            title: user.title,
            department: user.department,
            location: user.location,
            passwordHash: user.passwordHash,
            emailVerified: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const [createdUser] = await db.insert(users).values(newUser).returning();

        if (!createdUser) {
            throw new Error('Failed to create user');
        }

        // Create default user control entry
        await db.insert(userControls).values({
            userId: createdUser.id,
            status: 'active',
            roles: [],
            testerAccess: [],
            updatedAt: new Date(),
        });

        // Note: Account/Workspace membership logic would typically go here or in a service.
        // For now, we assume the DB schema handles the core user data.
        // If we need to maintain the exact same side-effects as memory repo (adding to global lists),
        // we would need tables for workspace_members and account_members.
        // Assuming those are not yet in the migration plan scope for this step (only users table was explicitly detailed),
        // but the plan mentioned "accounts" table which is for OAuth.
        // We will stick to the user creation for now.

        return this.mapToWorkspaceUser(createdUser);
    }

    async delete(userId: string): Promise<boolean> {
        if (!userId) return false;
        const result = await db.delete(users).where(eq(users.id, userId)).returning();
        return result.length > 0;
    }

    private mapToWorkspaceUser(dbUser: typeof users.$inferSelect): WorkspaceUser {
        const result: WorkspaceUser = {
            id: dbUser.id,
            name: dbUser.name || '',
            email: dbUser.email || '',
        };
        if (dbUser.image) {
            result.avatarUrl = dbUser.image;
        }
        if (dbUser.title) {
            result.title = dbUser.title;
        }
        if (dbUser.department) {
            result.department = dbUser.department;
        }
        if (dbUser.location) {
            result.location = dbUser.location;
        }
        if (dbUser.passwordHash) {
            result.passwordHash = dbUser.passwordHash;
        }
        return result;
    }
}
