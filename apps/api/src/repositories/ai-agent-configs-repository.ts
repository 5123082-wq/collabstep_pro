import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/config';
import { aiAgentConfigs, aiAgentPromptVersions } from '../db/schema';

// --- Types ---

export type DbAIAgentConfig = typeof aiAgentConfigs.$inferSelect;
export type NewAIAgentConfig = typeof aiAgentConfigs.$inferInsert;

export type DbAIAgentPromptVersion = typeof aiAgentPromptVersions.$inferSelect;
export type NewAIAgentPromptVersion = typeof aiAgentPromptVersions.$inferInsert;

export type AIAgentPrompts = {
    intake?: string;
    logoCheck?: string;
    generate?: string;
    qa?: string;
    followup?: string;
};

export type AIAgentConfigUpdateInput = {
    name?: string;
    description?: string | null;
    enabled?: boolean;
    icon?: string | null;
    limits?: DbAIAgentConfig['limits'] | null;
    parameters?: DbAIAgentConfig['parameters'] | null;
};

export type AIAgentPromptVersionUpdateInput = {
    status?: string;
    systemPrompt?: string | null;
    prompts?: AIAgentPrompts | null;
};

// --- AI Agent Configs Repository ---

export class AIAgentConfigsDbRepository {
    /**
     * Find agent config by ID
     */
    async findById(id: string): Promise<DbAIAgentConfig | null> {
        const [config] = await db
            .select()
            .from(aiAgentConfigs)
            .where(eq(aiAgentConfigs.id, id))
            .limit(1);

        return config || null;
    }

    /**
     * Find agent config by slug
     */
    async findBySlug(slug: string): Promise<DbAIAgentConfig | null> {
        const [config] = await db
            .select()
            .from(aiAgentConfigs)
            .where(eq(aiAgentConfigs.slug, slug))
            .limit(1);

        return config || null;
    }

    /**
     * List all agent configs
     */
    async listAll(options?: { enabledOnly?: boolean }): Promise<DbAIAgentConfig[]> {
        if (options?.enabledOnly) {
            return db
                .select()
                .from(aiAgentConfigs)
                .where(eq(aiAgentConfigs.enabled, true))
                .orderBy(aiAgentConfigs.name);
        }

        return db
            .select()
            .from(aiAgentConfigs)
            .orderBy(aiAgentConfigs.name);
    }

    /**
     * Create new agent config
     */
    async create(input: NewAIAgentConfig): Promise<DbAIAgentConfig> {
        const [created] = await db.insert(aiAgentConfigs).values(input).returning();

        if (!created) {
            throw new Error('Failed to create AI agent config');
        }

        return created;
    }

    /**
     * Update agent config
     */
    async update(id: string, patch: AIAgentConfigUpdateInput): Promise<DbAIAgentConfig | null> {
        const [updated] = await db
            .update(aiAgentConfigs)
            .set({
                ...patch,
                updatedAt: new Date(),
            })
            .where(eq(aiAgentConfigs.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Delete agent config
     */
    async delete(id: string): Promise<boolean> {
        const result = await db
            .delete(aiAgentConfigs)
            .where(eq(aiAgentConfigs.id, id))
            .returning();

        return result.length > 0;
    }
}

// --- Prompt Versions Repository ---

export class AIAgentPromptVersionsDbRepository {
    /**
     * Find prompt version by ID
     */
    async findById(id: string): Promise<DbAIAgentPromptVersion | null> {
        const [version] = await db
            .select()
            .from(aiAgentPromptVersions)
            .where(eq(aiAgentPromptVersions.id, id))
            .limit(1);

        return version || null;
    }

    /**
     * Find published version for agent
     */
    async findPublished(agentId: string): Promise<DbAIAgentPromptVersion | null> {
        const [version] = await db
            .select()
            .from(aiAgentPromptVersions)
            .where(
                and(
                    eq(aiAgentPromptVersions.agentId, agentId),
                    eq(aiAgentPromptVersions.status, 'published')
                )
            )
            .orderBy(desc(aiAgentPromptVersions.version))
            .limit(1);

        return version || null;
    }

    /**
     * List all versions for agent
     */
    async listByAgent(agentId: string): Promise<DbAIAgentPromptVersion[]> {
        return db
            .select()
            .from(aiAgentPromptVersions)
            .where(eq(aiAgentPromptVersions.agentId, agentId))
            .orderBy(desc(aiAgentPromptVersions.version));
    }

    /**
     * Get next version number for agent
     */
    async getNextVersionNumber(agentId: string): Promise<number> {
        const versions = await db
            .select({ version: aiAgentPromptVersions.version })
            .from(aiAgentPromptVersions)
            .where(eq(aiAgentPromptVersions.agentId, agentId))
            .orderBy(desc(aiAgentPromptVersions.version))
            .limit(1);

        return (versions[0]?.version || 0) + 1;
    }

    /**
     * Create new prompt version
     */
    async create(input: NewAIAgentPromptVersion): Promise<DbAIAgentPromptVersion> {
        const [created] = await db.insert(aiAgentPromptVersions).values(input).returning();

        if (!created) {
            throw new Error('Failed to create AI agent prompt version');
        }

        return created;
    }

    /**
     * Update prompt version (only draft versions can be updated)
     */
    async update(id: string, patch: AIAgentPromptVersionUpdateInput): Promise<DbAIAgentPromptVersion | null> {
        const [updated] = await db
            .update(aiAgentPromptVersions)
            .set(patch)
            .where(
                and(
                    eq(aiAgentPromptVersions.id, id),
                    eq(aiAgentPromptVersions.status, 'draft')
                )
            )
            .returning();

        return updated || null;
    }

    /**
     * Publish a version (archive previous published ones)
     */
    async publish(id: string): Promise<DbAIAgentPromptVersion | null> {
        const version = await this.findById(id);
        if (!version) return null;

        // Archive previous published versions for this agent
        await db
            .update(aiAgentPromptVersions)
            .set({ status: 'archived' })
            .where(
                and(
                    eq(aiAgentPromptVersions.agentId, version.agentId),
                    eq(aiAgentPromptVersions.status, 'published')
                )
            );

        // Publish this version
        const [published] = await db
            .update(aiAgentPromptVersions)
            .set({ status: 'published' })
            .where(eq(aiAgentPromptVersions.id, id))
            .returning();

        return published || null;
    }

    /**
     * Delete prompt version (only draft versions can be deleted)
     */
    async delete(id: string): Promise<boolean> {
        const result = await db
            .delete(aiAgentPromptVersions)
            .where(
                and(
                    eq(aiAgentPromptVersions.id, id),
                    eq(aiAgentPromptVersions.status, 'draft')
                )
            )
            .returning();

        return result.length > 0;
    }
}

// --- Singleton instances ---

export const aiAgentConfigsDbRepository = new AIAgentConfigsDbRepository();
export const aiAgentPromptVersionsDbRepository = new AIAgentPromptVersionsDbRepository();
