import { fileTrashRepository } from '../repositories/file-trash-repository';
import { organizationStorageUsageRepository } from '../repositories/organization-storage-usage-repository';
import { db } from '../db/config';
import { files, attachments } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Cleanup job for expired files in trash
 * 
 * Process:
 * 1. Find all expired trash entries (expiresAt < now, not restored)
 * 2. For each expired file:
 *    - Delete file from database (cascade will delete attachments)
 *    - Try to delete blob from Vercel (TODO: implement if needed)
 *    - Update organization storage usage (decrement)
 *    - Delete trash entry
 * 
 * Schedule: Daily at 3:00 AM (to be configured in cron)
 */
export async function cleanupExpiredFileTrash(): Promise<{
  processed: number;
  deleted: number;
  errors: number;
}> {
  const stats = {
    processed: 0,
    deleted: 0,
    errors: 0,
  };

  try {
    // 1. Find all expired trash entries
    const expiredEntries = await fileTrashRepository.findExpired();

    console.log(
      `[FileTrashCleanup] Found ${expiredEntries.length} expired files in trash`
    );

    for (const entry of expiredEntries) {
      stats.processed++;

      try {
        const file = entry.file;
        const organizationId = entry.organizationId;
        const fileSize = Number(file.sizeBytes);

        // 2. Delete file from database (cascade will delete attachments and trash entry)
        // We need to delete attachments first, then file
        await db.transaction(async (tx) => {
          // Delete attachments
          const fileAttachments = await tx
            .select()
            .from(attachments)
            .where(eq(attachments.fileId, file.id));

          if (fileAttachments.length > 0) {
            const attachmentIds = fileAttachments.map((a) => a.id);
            await tx
              .delete(attachments)
              .where(inArray(attachments.id, attachmentIds));
          }

          // Delete file (this will cascade delete trash entry)
          await tx
            .delete(files)
            .where(eq(files.id, file.id));
        });

        // 3. TODO: Delete blob from Vercel
        // This would require @vercel/blob SDK
        // For now, we log it
        console.log(
          `[FileTrashCleanup] TODO: Delete blob from Vercel for file ${file.id} (storageKey: ${file.storageKey})`
        );

        // 4. Update organization storage usage (decrement)
        await organizationStorageUsageRepository.decrement(organizationId, fileSize);

        // 5. Delete trash entry (should be cascade, but ensure it's deleted)
        // Actually, cascade should handle this, but we can verify
        stats.deleted++;

        console.log(
          `[FileTrashCleanup] Successfully deleted expired file ${file.id} from organization ${organizationId}`
        );
      } catch (error) {
        stats.errors++;
        console.error(
          `[FileTrashCleanup] Error deleting expired file ${entry.fileId}:`,
          error
        );
        // Continue with other files
      }
    }

    console.log(
      `[FileTrashCleanup] Completed: processed=${stats.processed}, deleted=${stats.deleted}, errors=${stats.errors}`
    );

    return stats;
  } catch (error) {
    console.error('[FileTrashCleanup] Fatal error:', error);
    throw error;
  }
}

