import { eq, and, isNull, lt, or } from 'drizzle-orm';
import { db } from '../db/config';
import { fileTrash, files } from '../db/schema';

export type DbFileTrash = typeof fileTrash.$inferSelect;
export type NewDbFileTrash = typeof fileTrash.$inferInsert;

export type FileTrashWithFile = DbFileTrash & {
  file: typeof files.$inferSelect;
};

/**
 * Repository for file trash (soft delete)
 */
export class FileTrashRepository {
  /**
   * Create a trash entry for a file
   */
  async create(input: NewDbFileTrash): Promise<DbFileTrash> {
    const [created] = await db
      .insert(fileTrash)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create file trash entry');
    }

    return created;
  }

  /**
   * Find trash entry by file ID
   */
  async findByFileId(fileId: string): Promise<DbFileTrash | null> {
    const [entry] = await db
      .select()
      .from(fileTrash)
      .where(
        and(
          eq(fileTrash.fileId, fileId),
          // Only non-restored entries
          isNull(fileTrash.restoredAt)
        )
      );

    return entry || null;
  }

  /**
   * Check if file is trashed (not restored)
   */
  async isTrashed(fileId: string): Promise<boolean> {
    const entry = await this.findByFileId(fileId);
    return entry !== null;
  }

  /**
   * List trash entries by organization
   */
  async listByOrganization(
    organizationId: string,
    options?: { projectId?: string; includeRestored?: boolean }
  ): Promise<FileTrashWithFile[]> {
    const conditions = [
      eq(fileTrash.organizationId, organizationId),
      ...(options?.projectId ? [eq(files.projectId, options.projectId)] : []),
      ...(options?.includeRestored ? [] : [isNull(fileTrash.restoredAt)])
    ];

    const results = await db
      .select({
        trash: fileTrash,
        file: files,
      })
      .from(fileTrash)
      .innerJoin(files, eq(fileTrash.fileId, files.id))
      .where(and(...conditions))
      .orderBy(fileTrash.deletedAt);

    return results.map((r) => ({
      ...r.trash,
      file: r.file,
    }));
  }

  /**
   * Restore a file from trash
   */
  async restore(fileId: string): Promise<boolean> {
    const result = await db
      .update(fileTrash)
      .set({ restoredAt: new Date() })
      .where(
        and(
          eq(fileTrash.fileId, fileId),
          isNull(fileTrash.restoredAt)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Mark expired entries (utility for cleanup)
   */
  async markExpired(): Promise<number> {
    // This is a no-op in our schema, but we can find expired entries
    const expired = await db
      .select()
      .from(fileTrash)
      .where(
        and(
          isNull(fileTrash.restoredAt),
          // expiresAt is not null and < now
          or(
            // If expiresAt is set and expired
            lt(fileTrash.expiresAt, new Date())
          )
        )
      );

    return expired.length;
  }

  /**
   * Find expired entries for cleanup
   */
  async findExpired(): Promise<FileTrashWithFile[]> {
    const results = await db
      .select({
        trash: fileTrash,
        file: files,
      })
      .from(fileTrash)
      .innerJoin(files, eq(fileTrash.fileId, files.id))
      .where(
        and(
          isNull(fileTrash.restoredAt),
          // expiresAt is not null and < now
          lt(fileTrash.expiresAt, new Date())
        )
      );

    return results.map((r) => ({
      ...r.trash,
      file: r.file,
    }));
  }

  /**
   * Delete expired entries (physical delete)
   * Returns deleted file IDs for cleanup
   */
  async deleteExpired(): Promise<string[]> {
    const expired = await this.findExpired();
    const fileIds = expired.map((e) => e.fileId);

    if (fileIds.length === 0) {
      return [];
    }

    // Delete trash entries
    await db
      .delete(fileTrash)
      .where(
        and(
          isNull(fileTrash.restoredAt),
          lt(fileTrash.expiresAt, new Date())
        )
      );

    return fileIds;
  }
}

export const fileTrashRepository = new FileTrashRepository();

