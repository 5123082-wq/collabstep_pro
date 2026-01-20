import { and, desc, eq } from 'drizzle-orm';
import { aiAgentsDb } from '../db/ai-agents-config';
import { brandbookAgentRuns } from '../db/schema';

export type DbBrandbookAgentRun = typeof brandbookAgentRuns.$inferSelect;
export type NewBrandbookAgentRun = typeof brandbookAgentRuns.$inferInsert;

export type BrandbookAgentRunUpdateInput = {
  status?: DbBrandbookAgentRun['status'];
  logoFileId?: DbBrandbookAgentRun['logoFileId'] | null;
  preferences?: DbBrandbookAgentRun['preferences'];
  outputLanguage?: DbBrandbookAgentRun['outputLanguage'] | null;
  watermarkText?: DbBrandbookAgentRun['watermarkText'] | null;
  contactBlock?: DbBrandbookAgentRun['contactBlock'] | null;
  pipelineType?: DbBrandbookAgentRun['pipelineType'] | null;
  outputFormat?: DbBrandbookAgentRun['outputFormat'] | null;
  previewFormat?: DbBrandbookAgentRun['previewFormat'] | null;
};

export class BrandbookAgentRunsRepository {
  async create(input: NewBrandbookAgentRun): Promise<DbBrandbookAgentRun> {
    const [created] = await aiAgentsDb.insert(brandbookAgentRuns).values(input).returning();

    if (!created) {
      throw new Error('Failed to create brandbook agent run');
    }

    return created;
  }

  async findById(id: string): Promise<DbBrandbookAgentRun | null> {
    const [run] = await aiAgentsDb
      .select()
      .from(brandbookAgentRuns)
      .where(eq(brandbookAgentRuns.id, id))
      .limit(1);

    return run || null;
  }

  async listByUser(options: {
    organizationId: string;
    createdBy: string;
    projectId?: string;
    limit?: number;
  }): Promise<DbBrandbookAgentRun[]> {
    const conditions = [
      eq(brandbookAgentRuns.organizationId, options.organizationId),
      eq(brandbookAgentRuns.createdBy, options.createdBy)
    ];

    if (options.projectId) {
      conditions.push(eq(brandbookAgentRuns.projectId, options.projectId));
    }

    const limit = options.limit ?? 50;

    return await aiAgentsDb
      .select()
      .from(brandbookAgentRuns)
      .where(and(...conditions))
      .orderBy(desc(brandbookAgentRuns.createdAt))
      .limit(limit);
  }

  async listByProject(options: {
    organizationId: string;
    projectId: string;
    limit?: number;
  }): Promise<DbBrandbookAgentRun[]> {
    const conditions = [
      eq(brandbookAgentRuns.organizationId, options.organizationId),
      eq(brandbookAgentRuns.projectId, options.projectId)
    ];

    const limit = options.limit ?? 50;

    return await aiAgentsDb
      .select()
      .from(brandbookAgentRuns)
      .where(and(...conditions))
      .orderBy(desc(brandbookAgentRuns.createdAt))
      .limit(limit);
  }

  async update(id: string, patch: BrandbookAgentRunUpdateInput): Promise<DbBrandbookAgentRun | null> {
    const updateData = {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.logoFileId !== undefined ? { logoFileId: patch.logoFileId } : {}),
      ...(patch.preferences !== undefined ? { preferences: patch.preferences } : {}),
      ...(patch.outputLanguage !== undefined ? { outputLanguage: patch.outputLanguage } : {}),
      ...(patch.watermarkText !== undefined ? { watermarkText: patch.watermarkText } : {}),
      ...(patch.contactBlock !== undefined ? { contactBlock: patch.contactBlock } : {}),
      ...(patch.pipelineType !== undefined ? { pipelineType: patch.pipelineType } : {}),
      ...(patch.outputFormat !== undefined ? { outputFormat: patch.outputFormat } : {}),
      ...(patch.previewFormat !== undefined ? { previewFormat: patch.previewFormat } : {}),
      updatedAt: new Date(),
    };

    const [updated] = await aiAgentsDb
      .update(brandbookAgentRuns)
      .set(updateData)
      .where(eq(brandbookAgentRuns.id, id))
      .returning();

    return updated || null;
  }
}

export const brandbookAgentRunsRepository = new BrandbookAgentRunsRepository();
