import { db } from '../db/config';
import { contracts } from '../db/schema';
import { eq } from 'drizzle-orm';

export type ContractStatus = 'offer' | 'accepted' | 'funded' | 'completed' | 'paid' | 'disputed';

export class ContractsRepository {
    async create(data: typeof contracts.$inferInsert) {
        const [contract] = await db.insert(contracts).values(data).returning();
        return contract;
    }

    async findByTask(taskId: string) {
        const [contract] = await db.select().from(contracts).where(eq(contracts.taskId, taskId));
        return contract || null;
    }

    async findById(id: string) {
        const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
        return contract || null;
    }

    /**
     * Найти все контракты организации
     */
    async findByOrganization(organizationId: string) {
        return await db
            .select()
            .from(contracts)
            .where(eq(contracts.organizationId, organizationId));
    }

    async updateStatus(id: string, status: ContractStatus) {
        const [updated] = await db.update(contracts)
            .set({ status, updatedAt: new Date() })
            .where(eq(contracts.id, id))
            .returning();
        return updated;
    }
}

export const contractsRepository = new ContractsRepository();

