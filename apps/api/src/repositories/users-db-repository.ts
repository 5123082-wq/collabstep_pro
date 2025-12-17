import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/config';
import { users, userControls } from '../db/schema';
import type { WorkspaceUser } from '../types';

import type { UsersRepository } from './users-repository.interface';
type UserInsert = typeof users.$inferInsert;

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
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
            return user ? this.mapToWorkspaceUser(user) : null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('[UsersDbRepository] Error in findByEmail:', {
                email,
                error: errorMessage,
                stack: errorStack,
                postgresUrl: process.env.POSTGRES_URL ? 'set' : 'not set'
            });
            // Пробрасываем ошибку дальше, чтобы вызывающий код мог ее обработать
            throw error;
        }
    }

    async updatePassword(email: string, passwordHash: string): Promise<boolean> {
        if (!email) return false;
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const result = await db
                .update(users)
                .set({ passwordHash, updatedAt: new Date() })
                .where(eq(users.email, normalizedEmail))
                .returning();
            return result.length > 0;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[UsersDbRepository] Error in updatePassword:', {
                email,
                error: errorMessage,
                postgresUrl: process.env.POSTGRES_URL ? 'set' : 'not set'
            });
            throw error;
        }
    }

    async create(user: Omit<WorkspaceUser, 'id'> & { id?: string; passwordHash?: string }): Promise<WorkspaceUser> {
        try {
            const normalizedEmail = user.email.trim().toLowerCase();
            const newUser = {
                id: user.id || crypto.randomUUID(),
                name: user.name.trim(),
                email: normalizedEmail,
                image: user.avatarUrl,
                title: user.title,
                department: user.department,
                location: user.location,
                timezone: user.timezone,
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
            try {
                await db.insert(userControls).values({
                    userId: createdUser.id,
                    status: 'active',
                    roles: [],
                    testerAccess: [],
                    updatedAt: new Date(),
                });
            } catch (error) {
                // Если userControls уже существует или другая ошибка, логируем но не падаем
                console.error('[UsersDbRepository] Error creating userControls:', error);
                // Продолжаем выполнение, так как пользователь уже создан
            }

            // Note: Account/Workspace membership logic would typically go here or in a service.
            // For now, we assume the DB schema handles the core user data.
            // If we need to maintain the exact same side-effects as memory repo (adding to global lists),
            // we would need tables for workspace_members and account_members.
            // Assuming those are not yet in the migration plan scope for this step (only users table was explicitly detailed),
            // but the plan mentioned "accounts" table which is for OAuth.
            // We will stick to the user creation for now.

            return this.mapToWorkspaceUser(createdUser);
        } catch (error) {
            console.error('[UsersDbRepository] Error in create:', error);
            console.error('[UsersDbRepository] User data:', { email: user.email, id: user.id });
            throw error;
        }
    }

    async update(id: string, data: Partial<WorkspaceUser>): Promise<WorkspaceUser | null> {
        if (!id) return null;

        const updateData: Partial<UserInsert> = {
            updatedAt: new Date(),
        };

        // Explicitly check for undefined, allow null values to be set
        if (data.name !== undefined) updateData.name = data.name;
        if (data.avatarUrl !== undefined) updateData.image = data.avatarUrl;
        if (data.title !== undefined) updateData.title = data.title;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        // Add other fields as needed

        if (Object.keys(updateData).length <= 1) { // Only updatedAt
            return this.findById(id);
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        if (!updatedUser) {
            console.error('[UsersDbRepository] Failed to update user:', id, updateData);
            return null;
        }

        return this.mapToWorkspaceUser(updatedUser);
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
        if (dbUser.timezone) {
            result.timezone = dbUser.timezone;
        }
        if (dbUser.passwordHash) {
            result.passwordHash = dbUser.passwordHash;
        }
        return result;
    }
}
