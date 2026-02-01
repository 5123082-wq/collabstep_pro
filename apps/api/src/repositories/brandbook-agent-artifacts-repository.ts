import { asc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { brandbookAgentArtifacts } from '../db/schema';

export type DbBrandbookAgentArtifact = typeof brandbookAgentArtifacts.$inferSelect;
export type NewBrandbookAgentArtifact = typeof brandbookAgentArtifacts.$inferInsert;
export type BrandbookAgentArtifactUpdateInput = {
  fileId?: DbBrandbookAgentArtifact['fileId'] | null;
  storageKey?: DbBrandbookAgentArtifact['storageKey'] | null;
  storageUrl?: DbBrandbookAgentArtifact['storageUrl'] | null;
  filename?: DbBrandbookAgentArtifact['filename'] | null;
  mimeType?: DbBrandbookAgentArtifact['mimeType'] | null;
  sizeBytes?: DbBrandbookAgentArtifact['sizeBytes'] | null;
};

export class BrandbookAgentArtifactsRepository {
  async create(input: NewBrandbookAgentArtifact): Promise<DbBrandbookAgentArtifact> {
    const [created] = await aiAgentsDb.insert(brandbookAgentArtifacts).values(input).returning();

    if (!created) {
      throw new Error('Failed to create brandbook agent artifact');
    }

    return created;
  }

  async findById(id: string): Promise<DbBrandbookAgentArtifact | null> {
    const [artifact] = await aiAgentsDb
      .select()
      .from(brandbookAgentArtifacts)
      .where(eq(brandbookAgentArtifacts.id, id))
      .limit(1);

    return artifact || null;
  }

  async listByRun(runId: string): Promise<DbBrandbookAgentArtifact[]> {
    return await aiAgentsDb
      .select()
      .from(brandbookAgentArtifacts)
      .where(eq(brandbookAgentArtifacts.runId, runId))
      .orderBy(asc(brandbookAgentArtifacts.createdAt));
  }

  async update(id: string, patch: BrandbookAgentArtifactUpdateInput): Promise<DbBrandbookAgentArtifact | null> {
    const updateData = {
      ...(patch.fileId !== undefined ? { fileId: patch.fileId } : {}),
      ...(patch.storageKey !== undefined ? { storageKey: patch.storageKey } : {}),
      ...(patch.storageUrl !== undefined ? { storageUrl: patch.storageUrl } : {}),
      ...(patch.filename !== undefined ? { filename: patch.filename } : {}),
      ...(patch.mimeType !== undefined ? { mimeType: patch.mimeType } : {}),
      ...(patch.sizeBytes !== undefined ? { sizeBytes: patch.sizeBytes } : {}),
    };

    const [updated] = await aiAgentsDb
      .update(brandbookAgentArtifacts)
      .set(updateData)
      .where(eq(brandbookAgentArtifacts.id, id))
      .returning();

    return updated || null;
  }
}

export const brandbookAgentArtifactsRepository = new BrandbookAgentArtifactsRepository();
