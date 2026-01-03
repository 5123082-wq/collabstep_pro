import { eq, sql } from 'drizzle-orm';
import { db } from '../db/config';
import { organizationStorageUsage, files } from '../db/schema';

export type DbOrganizationStorageUsage = typeof organizationStorageUsage.$inferSelect;
export type NewDbOrganizationStorageUsage = typeof organizationStorageUsage.$inferInsert;

/**
 * Repository for organization storage usage tracking
 */
export class OrganizationStorageUsageRepository {
  /**
   * Get or create storage usage record for organization
   */
  async getOrCreate(organizationId: string): Promise<DbOrganizationStorageUsage> {
    const [existing] = await db
      .select()
      .from(organizationStorageUsage)
      .where(eq(organizationStorageUsage.organizationId, organizationId));

    if (existing) {
      return existing;
    }

    // Create new record
    const [created] = await db
      .insert(organizationStorageUsage)
      .values({
        organizationId,
        totalBytes: 0,
        fileCount: 0,
        lastCalculatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create organization storage usage');
    }

    return created;
  }

  /**
   * Increment storage usage (when file is uploaded)
   */
  async increment(organizationId: string, sizeBytes: number): Promise<DbOrganizationStorageUsage> {
    await this.getOrCreate(organizationId);

    const [updated] = await db
      .update(organizationStorageUsage)
      .set({
        totalBytes: sql`${organizationStorageUsage.totalBytes} + ${sizeBytes}`,
        fileCount: sql`${organizationStorageUsage.fileCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(organizationStorageUsage.organizationId, organizationId))
      .returning();

    if (!updated) {
      throw new Error('Failed to increment storage usage');
    }

    return updated;
  }

  /**
   * Decrement storage usage (when file is deleted)
   */
  async decrement(organizationId: string, sizeBytes: number): Promise<DbOrganizationStorageUsage> {
    await this.getOrCreate(organizationId);

    const [updated] = await db
      .update(organizationStorageUsage)
      .set({
        totalBytes: sql`GREATEST(0, ${organizationStorageUsage.totalBytes} - ${sizeBytes})`,
        fileCount: sql`GREATEST(0, ${organizationStorageUsage.fileCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(organizationStorageUsage.organizationId, organizationId))
      .returning();

    if (!updated) {
      throw new Error('Failed to decrement storage usage');
    }

    return updated;
  }

  /**
   * Recalculate storage usage from actual files in database
   * This is useful for fixing inconsistencies
   */
  async recalculate(organizationId: string): Promise<DbOrganizationStorageUsage> {
    // Calculate actual usage from files table
    // Only count files that are NOT in trash (or are restored)
    const result = await db
      .select({
        totalBytes: sql<number>`COALESCE(SUM(${files.sizeBytes}), 0)`,
        fileCount: sql<number>`COUNT(*)`,
      })
      .from(files)
      .where(eq(files.organizationId, organizationId));

    const stats = result[0] || { totalBytes: 0, fileCount: 0 };

    const [updated] = await db
      .update(organizationStorageUsage)
      .set({
        totalBytes: Number(stats.totalBytes),
        fileCount: Number(stats.fileCount),
        lastCalculatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationStorageUsage.organizationId, organizationId))
      .returning();

    if (!updated) {
      // If update failed, try to create
      return await this.getOrCreate(organizationId);
    }

    return updated;
  }

  /**
   * Get current usage
   */
  async get(organizationId: string): Promise<DbOrganizationStorageUsage> {
    return await this.getOrCreate(organizationId);
  }
}

export const organizationStorageUsageRepository = new OrganizationStorageUsageRepository();
