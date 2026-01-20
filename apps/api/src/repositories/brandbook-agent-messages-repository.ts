import { asc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { brandbookAgentMessages } from '../db/schema';

export type DbBrandbookAgentMessage = typeof brandbookAgentMessages.$inferSelect;
export type NewBrandbookAgentMessage = typeof brandbookAgentMessages.$inferInsert;

export class BrandbookAgentMessagesRepository {
  async create(input: NewBrandbookAgentMessage): Promise<DbBrandbookAgentMessage> {
    const [created] = await aiAgentsDb.insert(brandbookAgentMessages).values(input).returning();

    if (!created) {
      throw new Error('Failed to create brandbook agent message');
    }

    return created;
  }

  async listByRun(runId: string): Promise<DbBrandbookAgentMessage[]> {
    return await aiAgentsDb
      .select()
      .from(brandbookAgentMessages)
      .where(eq(brandbookAgentMessages.runId, runId))
      .orderBy(asc(brandbookAgentMessages.createdAt));
  }
}

export const brandbookAgentMessagesRepository = new BrandbookAgentMessagesRepository();
