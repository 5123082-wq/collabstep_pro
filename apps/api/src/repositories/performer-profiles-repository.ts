import { eq, and } from 'drizzle-orm';
import { db } from '../db/config';
import { performerProfiles, users } from '../db/schema';

export type PerformerProfile = typeof performerProfiles.$inferSelect;
export type NewPerformerProfile = typeof performerProfiles.$inferInsert;

export class PerformerProfilesRepository {

    async upsert(profile: NewPerformerProfile): Promise<PerformerProfile> {
        // Check if exists first
        const existing = await this.findByUserId(profile.userId);

        if (existing) {
            const [updated] = await db
                .update(performerProfiles)
                .set({ ...profile, updatedAt: new Date() })
                .where(eq(performerProfiles.id, existing.id))
                .returning();
            if (!updated) {
                throw new Error('Failed to update performer profile');
            }
            return updated;
        } else {
            const [created] = await db
                .insert(performerProfiles)
                .values(profile)
                .returning();
            if (!created) {
                throw new Error('Failed to create performer profile');
            }
            return created;
        }
    }

    async findByUserId(userId: string): Promise<PerformerProfile | null> {
        const [profile] = await db
            .select()
            .from(performerProfiles)
            .where(eq(performerProfiles.userId, userId));
        return profile || null;
    }

    async findById(id: string): Promise<PerformerProfile | null> {
        const [profile] = await db
            .select()
            .from(performerProfiles)
            .where(eq(performerProfiles.id, id));
        return profile || null;
    }

    async updateVisibility(userId: string, isPublic: boolean): Promise<PerformerProfile | null> {
        const [updated] = await db
            .update(performerProfiles)
            .set({ isPublic, updatedAt: new Date() })
            .where(eq(performerProfiles.userId, userId))
            .returning();
        return updated || null;
    }

    /**
     * Search/List public profiles
     * Simple implementation, can be extended with filters
     */
    async listPublic(options?: {
        limit?: number;
        offset?: number;
        specialization?: string
    }): Promise<(PerformerProfile & { user: { name: string | null; image: string | null } })[]> {
        const limit = options?.limit || 20;
        const offset = options?.offset || 0;

        const conditions = [eq(performerProfiles.isPublic, true)];

        if (options?.specialization) {
            conditions.push(eq(performerProfiles.specialization, options.specialization));
        }

        const query = db
            .select({
                profile: performerProfiles,
                user: {
                    name: users.name,
                    image: users.image
                }
            })
            .from(performerProfiles)
            .innerJoin(users, eq(performerProfiles.userId, users.id))
            .where(and(...conditions));

        const results = await query.limit(limit).offset(offset);

        return results.map(r => ({
            ...r.profile,
            user: r.user
        }));
    }
}

export const performerProfilesRepository = new PerformerProfilesRepository();

