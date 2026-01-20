import { asc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { brandbookAgentArtifacts } from '../db/schema';

export type DbBrandbookAgentArtifact = typeof brandbookAgentArtifacts.$inferSelect;
export type NewBrandbookAgentArtifact = typeof brandbookAgentArtifacts.$inferInsert;

export class BrandbookAgentArtifactsRepository {
  async create(input: NewBrandbookAgentArtifact): Promise<DbBrandbookAgentArtifact> {
    const [created] = await aiAgentsDb.insert(brandbookAgentArtifacts).values(input).returning();

    if (!created) {
      throw new Error('Failed to create brandbook agent artifact');
    }

    return created;
  }

  async listByRun(runId: string): Promise<DbBrandbookAgentArtifact[]> {
    return await aiAgentsDb
      .select()
      .from(brandbookAgentArtifacts)
      .where(eq(brandbookAgentArtifacts.runId, runId))
      .orderBy(asc(brandbookAgentArtifacts.createdAt));
  }
}

export const brandbookAgentArtifactsRepository = new BrandbookAgentArtifactsRepository();
