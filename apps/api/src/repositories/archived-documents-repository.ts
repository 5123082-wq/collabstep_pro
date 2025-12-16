import { eq } from 'drizzle-orm';
import { db } from '../db/config';
import { archivedDocuments } from '../db/schema';
import type { ArchivedDocument } from '../types';

type DbArchivedDocument = typeof archivedDocuments.$inferSelect;

/**
 * Конвертирует DB запись в ArchivedDocument (конвертирует Date в ISO строки)
 */
function mapDbToArchivedDocument(dbDoc: DbArchivedDocument): ArchivedDocument {
  const result: ArchivedDocument = {
    id: dbDoc.id,
    archiveId: dbDoc.archiveId,
    originalDocumentId: dbDoc.originalDocumentId,
    originalProjectId: dbDoc.originalProjectId,
    projectName: dbDoc.projectName,
    title: dbDoc.title,
    fileId: dbDoc.fileId,
    fileUrl: dbDoc.fileUrl,
    fileSizeBytes: dbDoc.fileSizeBytes,
    archivedAt: (dbDoc.archivedAt ?? new Date()).toISOString(),
    expiresAt: dbDoc.expiresAt.toISOString(),
  };

  if (dbDoc.type !== null) {
    result.type = dbDoc.type;
  }

  if (dbDoc.metadata !== null) {
    result.metadata = dbDoc.metadata as Record<string, unknown>;
  }

  return result;
}

export class ArchivedDocumentsRepository {
  /**
   * Создать запись архивированного документа
   */
  async create(data: {
    archiveId: string;
    originalDocumentId: string;
    originalProjectId: string;
    projectName: string;
    title: string;
    type?: string;
    fileId: string;
    fileUrl: string;
    fileSizeBytes: number;
    expiresAt: string; // ISO string
    metadata?: Record<string, unknown>;
  }): Promise<ArchivedDocument> {
    const [created] = await db
      .insert(archivedDocuments)
      .values({
        archiveId: data.archiveId,
        originalDocumentId: data.originalDocumentId,
        originalProjectId: data.originalProjectId,
        projectName: data.projectName,
        title: data.title,
        type: data.type ?? null,
        fileId: data.fileId,
        fileUrl: data.fileUrl,
        fileSizeBytes: data.fileSizeBytes,
        expiresAt: new Date(data.expiresAt),
        metadata: data.metadata ?? null,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create archived document');
    }

    return mapDbToArchivedDocument(created);
  }

  /**
   * Найти все документы архива
   */
  async findByArchive(archiveId: string): Promise<ArchivedDocument[]> {
    const documents = await db
      .select()
      .from(archivedDocuments)
      .where(eq(archivedDocuments.archiveId, archiveId));

    return documents.map(mapDbToArchivedDocument);
  }

  /**
   * Удалить все документы архива
   */
  async deleteByArchive(archiveId: string): Promise<void> {
    await db
      .delete(archivedDocuments)
      .where(eq(archivedDocuments.archiveId, archiveId));
  }
}

export const archivedDocumentsRepository = new ArchivedDocumentsRepository();
