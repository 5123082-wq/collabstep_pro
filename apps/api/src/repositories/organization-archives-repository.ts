import { eq, and, lt, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/config';
import { organizationArchives } from '../db/schema';
import type { OrganizationArchive, ArchiveRetentionPeriod } from '../types';

type DbArchive = typeof organizationArchives.$inferSelect;

/**
 * Конвертирует DB запись в OrganizationArchive (конвертирует Date в ISO строки)
 */
function mapDbToArchive(dbArchive: DbArchive): OrganizationArchive {
  return {
    id: dbArchive.id,
    organizationId: dbArchive.organizationId,
    organizationName: dbArchive.organizationName,
    ownerId: dbArchive.ownerId,
    closedAt: dbArchive.closedAt.toISOString(),
    expiresAt: dbArchive.expiresAt.toISOString(),
    status: dbArchive.status as 'active' | 'expired' | 'deleted',
    retentionDays: dbArchive.retentionDays as ArchiveRetentionPeriod,
    snapshot: dbArchive.snapshot as OrganizationArchive['snapshot'],
    createdAt: (dbArchive.createdAt ?? new Date()).toISOString(),
    updatedAt: (dbArchive.updatedAt ?? new Date()).toISOString(),
  };
}

export class OrganizationArchivesRepository {
  /**
   * Создать новый архив организации
   */
  async create(data: {
    organizationId: string;
    organizationName: string;
    ownerId: string;
    retentionDays: ArchiveRetentionPeriod;
    snapshot: OrganizationArchive['snapshot'];
  }): Promise<OrganizationArchive> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + data.retentionDays);

    const [created] = await db
      .insert(organizationArchives)
      .values({
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        ownerId: data.ownerId,
        closedAt: now,
        expiresAt,
        status: 'active',
        retentionDays: data.retentionDays,
        snapshot: data.snapshot,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create organization archive');
    }

    return mapDbToArchive(created);
  }

  /**
   * Найти архив по ID
   */
  async findById(id: string): Promise<OrganizationArchive | null> {
    const [archive] = await db
      .select()
      .from(organizationArchives)
      .where(eq(organizationArchives.id, id));

    return archive ? mapDbToArchive(archive) : null;
  }

  /**
   * Найти все архивы владельца
   */
  async findByOwner(ownerId: string): Promise<OrganizationArchive[]> {
    const archives = await db
      .select()
      .from(organizationArchives)
      .where(eq(organizationArchives.ownerId, ownerId))
      .orderBy(sql`${organizationArchives.createdAt} DESC`);

    return archives.map(mapDbToArchive);
  }

  /**
   * Найти просроченные архивы (expiresAt < now)
   */
  async findExpired(): Promise<OrganizationArchive[]> {
    const now = new Date();
    const archives = await db
      .select()
      .from(organizationArchives)
      .where(
        and(
          lt(organizationArchives.expiresAt, now),
          eq(organizationArchives.status, 'active')
        )
      );

    return archives.map(mapDbToArchive);
  }

  /**
   * Найти архивы, которые истекают через указанное количество дней
   * Используется для отправки уведомлений перед удалением
   */
  async findExpiringIn(days: number): Promise<OrganizationArchive[]> {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);

    // Найти архивы, которые истекают между now и targetDate
    const archives = await db
      .select()
      .from(organizationArchives)
      .where(
        and(
          gte(organizationArchives.expiresAt, now),
          lte(organizationArchives.expiresAt, targetDate),
          eq(organizationArchives.status, 'active')
        )
      );

    return archives.map(mapDbToArchive);
  }

  /**
   * Пометить архив как удалённый
   */
  async markDeleted(id: string): Promise<void> {
    await db
      .update(organizationArchives)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(organizationArchives.id, id));
  }
}

export const organizationArchivesRepository = new OrganizationArchivesRepository();
