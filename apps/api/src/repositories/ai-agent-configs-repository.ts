import { and, desc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { aiAgentConfigs, aiAgentPromptVersions, users } from '../db/schema';

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

export type AIAgentPromptBlock = {
    id: string;
    order: number;
    name: string;
    content: string;
    stepKey?: 'intake' | 'logoCheck' | 'generate' | 'qa' | 'followup';
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
    blocks?: AIAgentPromptBlock[] | null;
};

// --- AI Agent Configs Repository ---

export class AIAgentConfigsDbRepository {
    /**
     * Find agent config by ID
     */
    async findById(id: string): Promise<DbAIAgentConfig | null> {
        const [config] = await aiAgentsDb
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
        const [config] = await aiAgentsDb
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
            return aiAgentsDb
                .select()
                .from(aiAgentConfigs)
                .where(eq(aiAgentConfigs.enabled, true))
                .orderBy(aiAgentConfigs.name);
        }

        return aiAgentsDb
            .select()
            .from(aiAgentConfigs)
            .orderBy(aiAgentConfigs.name);
    }

    /**
     * Create new agent config
     */
    async create(input: NewAIAgentConfig): Promise<DbAIAgentConfig> {
        const [created] = await aiAgentsDb.insert(aiAgentConfigs).values(input).returning();

        if (!created) {
            throw new Error('Failed to create AI agent config');
        }

        return created;
    }

    /**
     * Update agent config
     */
    async update(id: string, patch: AIAgentConfigUpdateInput): Promise<DbAIAgentConfig | null> {
        const [updated] = await aiAgentsDb
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
        const result = await aiAgentsDb
            .delete(aiAgentConfigs)
            .where(eq(aiAgentConfigs.id, id))
            .returning();

        return result.length > 0;
    }

    /**
     * Ensure AI user exists for an agent and link it to the config.
     * This is idempotent — safe to call multiple times.
     *
     * @param slug - Agent config slug (e.g., 'brandbook')
     * @param userData - AI user data to create if not exists
     * @returns The linked user ID, or null if config not found
     */
    async ensureAgentUser(
        slug: string,
        userData: {
            email: string;
            name: string;
            title?: string;
        }
    ): Promise<string | null> {
        // Find agent config
        const config = await this.findBySlug(slug);
        if (!config) {
            console.warn(`[AIAgentConfigsDbRepository] Config with slug="${slug}" not found`);
            return null;
        }

        // If already linked, verify user exists and return
        if (config.userId) {
            const [existingUser] = await aiAgentsDb
                .select()
                .from(users)
                .where(eq(users.id, config.userId))
                .limit(1);

            if (existingUser) {
                // Ensure is_ai flag is set
                if (!existingUser.isAi) {
                    await aiAgentsDb
                        .update(users)
                        .set({ isAi: true, updatedAt: new Date() })
                        .where(eq(users.id, existingUser.id));
                }
                return config.userId;
            }
            // User was deleted, need to create new one
        }

        // Check if user with this email already exists
        const normalizedEmail = userData.email.trim().toLowerCase();
        const [existingUser] = await aiAgentsDb
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        let userId: string;

        if (existingUser) {
            userId = existingUser.id;
            // Ensure is_ai flag is set
            if (!existingUser.isAi) {
                await aiAgentsDb
                    .update(users)
                    .set({ isAi: true, updatedAt: new Date() })
                    .where(eq(users.id, existingUser.id));
            }
        } else {
            // Create new AI user
            const [newUser] = await aiAgentsDb
                .insert(users)
                .values({
                    id: crypto.randomUUID(),
                    name: userData.name.trim(),
                    email: normalizedEmail,
                    title: userData.title,
                    isAi: true,
                    emailVerified: null,
                    image: null,
                    passwordHash: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            if (!newUser) {
                throw new Error(`Failed to create AI user for agent "${slug}"`);
            }

            userId = newUser.id;
        }

        // Link user to config
        await aiAgentsDb
            .update(aiAgentConfigs)
            .set({ userId, updatedAt: new Date() })
            .where(eq(aiAgentConfigs.id, config.id));

        return userId;
    }

    /**
     * Ensure Brandbook Agent has a linked AI user.
     * Convenience method with hardcoded Brandbook Agent data.
     *
     * @returns The linked user ID, or null if brandbook config not found
     */
    async ensureBrandbookAgentUser(): Promise<string | null> {
        return this.ensureAgentUser('brandbook', {
            email: 'brandbook.agent@collabverse.ai',
            name: 'Brandbook Agent',
            title: 'AI-агент для генерации брендбуков',
        });
    }
}

// --- Prompt Versions Repository ---

export class AIAgentPromptVersionsDbRepository {
    /**
     * Find prompt version by ID
     */
    async findById(id: string): Promise<DbAIAgentPromptVersion | null> {
        const [version] = await aiAgentsDb
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
        const [version] = await aiAgentsDb
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
        return aiAgentsDb
            .select()
            .from(aiAgentPromptVersions)
            .where(eq(aiAgentPromptVersions.agentId, agentId))
            .orderBy(desc(aiAgentPromptVersions.version));
    }

    /**
     * Get next version number for agent
     */
    async getNextVersionNumber(agentId: string): Promise<number> {
        const versions = await aiAgentsDb
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
        const [created] = await aiAgentsDb.insert(aiAgentPromptVersions).values(input).returning();

        if (!created) {
            throw new Error('Failed to create AI agent prompt version');
        }

        return created;
    }

    /**
     * Update prompt version (only draft versions can be updated)
     */
    async update(id: string, patch: AIAgentPromptVersionUpdateInput): Promise<DbAIAgentPromptVersion | null> {
        const [updated] = await aiAgentsDb
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
        await aiAgentsDb
            .update(aiAgentPromptVersions)
            .set({ status: 'archived' })
            .where(
                and(
                    eq(aiAgentPromptVersions.agentId, version.agentId),
                    eq(aiAgentPromptVersions.status, 'published')
                )
            );

        // Publish this version
        const [published] = await aiAgentsDb
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
        const result = await aiAgentsDb
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
