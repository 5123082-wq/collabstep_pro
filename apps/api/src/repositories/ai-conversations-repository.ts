import { and, desc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { db } from '../db/config';
import { aiConversations, aiConversationMessages, aiAgentConfigs, users } from '../db/schema';

// --- Types ---

export type DbAIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;

export type DbAIConversationMessage = typeof aiConversationMessages.$inferSelect;
export type NewAIConversationMessage = typeof aiConversationMessages.$inferInsert;

export interface AIConversationWithAgent extends DbAIConversation {
    agent: {
        id: string;
        slug: string;
        name: string;
        icon: string | null;
    };
    lastMessage?: {
        content: string;
        role: string;
        createdAt: Date | null;
    } | undefined;
}

// --- AI Conversations Repository ---

export class AIConversationsRepository {
    /**
     * Ensure user exists in AI database.
     * Required when AI_AGENTS_DATABASE_URL points to a separate database,
     * since ai_conversation has FK to user table.
     * 
     * This is a lazy sync: we only create the user record when they
     * actually use AI Hub features.
     */
    private async ensureUserInAiDb(userId: string): Promise<void> {
        // Check if user already exists in AI DB
        const [existing] = await aiAgentsDb
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, userId));

        if (existing) return;

        // Fetch user info from main database
        const [mainUser] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!mainUser) {
            throw new Error(`User ${userId} not found in main database`);
        }

        // Create user in AI database (minimal fields for FK satisfaction)
        try {
            await aiAgentsDb
                .insert(users)
                .values({
                    id: mainUser.id,
                    email: mainUser.email,
                    name: mainUser.name,
                    image: mainUser.image,
                    isAi: false,
                    createdAt: new Date(),
                })
                .onConflictDoNothing(); // Idempotent: ignore if race condition
        } catch (error) {
            // If insert fails due to duplicate key (race condition), that's OK
            const isDuplicateKey = error instanceof Error && 
                (error.message.includes('duplicate key') || error.message.includes('unique constraint'));
            if (!isDuplicateKey) {
                throw error;
            }
        }
    }

    /**
     * List all conversations for a user, with agent info
     */
    async listByUser(userId: string): Promise<AIConversationWithAgent[]> {
        const conversations = await aiAgentsDb
            .select({
                conversation: aiConversations,
                agent: {
                    id: aiAgentConfigs.id,
                    slug: aiAgentConfigs.slug,
                    name: aiAgentConfigs.name,
                    icon: aiAgentConfigs.icon,
                },
            })
            .from(aiConversations)
            .innerJoin(aiAgentConfigs, eq(aiConversations.agentConfigId, aiAgentConfigs.id))
            .where(eq(aiConversations.userId, userId))
            .orderBy(desc(aiConversations.lastMessageAt));

        // Get last message for each conversation
        const result: AIConversationWithAgent[] = [];
        for (const row of conversations) {
            const [lastMessage] = await aiAgentsDb
                .select({
                    content: aiConversationMessages.content,
                    role: aiConversationMessages.role,
                    createdAt: aiConversationMessages.createdAt,
                })
                .from(aiConversationMessages)
                .where(eq(aiConversationMessages.conversationId, row.conversation.id))
                .orderBy(desc(aiConversationMessages.createdAt))
                .limit(1);

            result.push({
                ...row.conversation,
                agent: row.agent,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    role: lastMessage.role,
                    createdAt: lastMessage.createdAt,
                } : undefined,
            });
        }

        return result;
    }

    /**
     * Find conversation by ID
     */
    async findById(id: string): Promise<AIConversationWithAgent | null> {
        const [row] = await aiAgentsDb
            .select({
                conversation: aiConversations,
                agent: {
                    id: aiAgentConfigs.id,
                    slug: aiAgentConfigs.slug,
                    name: aiAgentConfigs.name,
                    icon: aiAgentConfigs.icon,
                },
            })
            .from(aiConversations)
            .innerJoin(aiAgentConfigs, eq(aiConversations.agentConfigId, aiAgentConfigs.id))
            .where(eq(aiConversations.id, id));

        if (!row) return null;

        return {
            ...row.conversation,
            agent: row.agent,
        };
    }

    /**
     * Find or create conversation between user and agent
     */
    async findOrCreate(userId: string, agentConfigId: string): Promise<DbAIConversation> {
        // Ensure user exists in AI database (for FK constraint)
        await this.ensureUserInAiDb(userId);

        // Check for existing conversation
        const [existing] = await aiAgentsDb
            .select()
            .from(aiConversations)
            .where(
                and(
                    eq(aiConversations.userId, userId),
                    eq(aiConversations.agentConfigId, agentConfigId)
                )
            );

        if (existing) return existing;

        // Get agent name for title
        const [agent] = await aiAgentsDb
            .select({ name: aiAgentConfigs.name })
            .from(aiAgentConfigs)
            .where(eq(aiAgentConfigs.id, agentConfigId));

        // Create new conversation
        const [conversation] = await aiAgentsDb
            .insert(aiConversations)
            .values({
                userId,
                agentConfigId,
                title: agent ? `Диалог с ${agent.name}` : 'Новый диалог',
            })
            .returning();

        if (!conversation) {
            throw new Error('Failed to create conversation');
        }

        return conversation;
    }

    /**
     * Create a new conversation
     */
    async create(data: NewAIConversation): Promise<DbAIConversation> {
        // Ensure user exists in AI database (for FK constraint)
        await this.ensureUserInAiDb(data.userId);

        const [conversation] = await aiAgentsDb
            .insert(aiConversations)
            .values(data)
            .returning();

        if (!conversation) {
            throw new Error('Failed to create conversation');
        }

        return conversation;
    }

    /**
     * Update conversation (e.g., lastMessageAt, title)
     */
    async update(id: string, data: Partial<Pick<DbAIConversation, 'title' | 'lastMessageAt'>>): Promise<DbAIConversation | null> {
        const [conversation] = await aiAgentsDb
            .update(aiConversations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(aiConversations.id, id))
            .returning();

        return conversation ?? null;
    }

    /**
     * Delete conversation and all its messages
     */
    async delete(id: string): Promise<boolean> {
        const result = await aiAgentsDb
            .delete(aiConversations)
            .where(eq(aiConversations.id, id))
            .returning();

        return result.length > 0;
    }

    /**
     * Check if user owns the conversation
     */
    async isOwner(conversationId: string, userId: string): Promise<boolean> {
        const [conversation] = await aiAgentsDb
            .select({ userId: aiConversations.userId })
            .from(aiConversations)
            .where(eq(aiConversations.id, conversationId));

        return conversation?.userId === userId;
    }

    // --- Message methods ---

    /**
     * List messages in a conversation
     */
    async listMessages(conversationId: string, options?: { limit?: number; offset?: number }): Promise<DbAIConversationMessage[]> {
        let query = aiAgentsDb
            .select()
            .from(aiConversationMessages)
            .where(eq(aiConversationMessages.conversationId, conversationId))
            .orderBy(aiConversationMessages.createdAt);

        if (options?.limit) {
            query = query.limit(options.limit) as typeof query;
        }
        if (options?.offset) {
            query = query.offset(options.offset) as typeof query;
        }

        return query;
    }

    /**
     * Add message to conversation
     */
    async addMessage(data: NewAIConversationMessage): Promise<DbAIConversationMessage> {
        const [message] = await aiAgentsDb
            .insert(aiConversationMessages)
            .values(data)
            .returning();

        if (!message) {
            throw new Error('Failed to create message');
        }

        // Update lastMessageAt on conversation
        await aiAgentsDb
            .update(aiConversations)
            .set({ lastMessageAt: new Date(), updatedAt: new Date() })
            .where(eq(aiConversations.id, data.conversationId));

        return message;
    }

    /**
     * Get message by ID
     */
    async getMessageById(id: string): Promise<DbAIConversationMessage | null> {
        const [message] = await aiAgentsDb
            .select()
            .from(aiConversationMessages)
            .where(eq(aiConversationMessages.id, id));

        return message ?? null;
    }
}

export const aiConversationsRepository = new AIConversationsRepository();
