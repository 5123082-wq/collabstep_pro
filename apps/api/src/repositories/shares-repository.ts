import { eq, and, isNotNull, lt } from 'drizzle-orm';
import { db } from '../db/config';
import { shares, files } from '../db/schema';

export type DbShare = typeof shares.$inferSelect;
export type NewDbShare = typeof shares.$inferInsert;

/**
 * Repository for share links (public file sharing)
 */
export class SharesRepository {
  /**
   * Create a new share link
   */
  async create(input: NewDbShare): Promise<DbShare> {
    const [created] = await db
      .insert(shares)
      .values(input)
      .returning();

    if (!created) {
      throw new Error('Failed to create share');
    }

    return created;
  }

  /**
   * Find share by token
   */
  async findByToken(token: string): Promise<DbShare | null> {
    const [share] = await db
      .select()
      .from(shares)
      .where(eq(shares.token, token));

    return share || null;
  }

  /**
   * Find share by token with file info
   */
  async findByTokenWithFile(token: string): Promise<(DbShare & { file: typeof files.$inferSelect }) | null> {
    const [result] = await db
      .select({
        share: shares,
        file: files,
      })
      .from(shares)
      .innerJoin(files, eq(shares.fileId, files.id))
      .where(eq(shares.token, token));

    if (!result) {
      return null;
    }

    return {
      ...result.share,
      file: result.file,
    };
  }

  /**
   * Check if token is valid (exists, not expired, not revoked)
   */
  async isValidToken(token: string, scope: 'view' | 'download'): Promise<boolean> {
    const share = await this.findByToken(token);
    if (!share) {
      return false;
    }

    // Check scope
    if (share.scope !== scope) {
      return false;
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Revoke (delete) a share by token
   */
  async revokeByToken(token: string): Promise<boolean> {
    const result = await db
      .delete(shares)
      .where(eq(shares.token, token))
      .returning();

    return result.length > 0;
  }

  /**
   * Revoke all shares for a file
   */
  async revokeByFileId(fileId: string): Promise<number> {
    const result = await db
      .delete(shares)
      .where(eq(shares.fileId, fileId))
      .returning();

    return result.length;
  }

  /**
   * List shares for a file
   */
  async listByFileId(fileId: string): Promise<DbShare[]> {
    return await db
      .select()
      .from(shares)
      .where(eq(shares.fileId, fileId))
      .orderBy(shares.createdAt);
  }

  /**
   * Clean up expired shares (utility method)
   */
  async cleanupExpired(): Promise<number> {
    const result = await db
      .delete(shares)
      .where(
        and(
          // expiresAt is not null
          isNotNull(shares.expiresAt),
          // expiresAt < now
          lt(shares.expiresAt, new Date())
        )
      )
      .returning();

    return result.length;
  }
}

export const sharesRepository = new SharesRepository();

