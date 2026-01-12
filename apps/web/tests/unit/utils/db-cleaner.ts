import { db } from '@collabverse/api/db/config';
import {
  attachments,
  archivedDocuments,
  contracts,
  fileTrash,
  files,
  folders,
  organizationArchives,
  organizationMembers,
  organizations,
  organizationSubscriptions,
  organizationStorageUsage,
  projects,
  shares,
  subscriptionPlans,
  users
} from '@collabverse/api/db/schema';

/**
 * Очищает БД для unit/API тестов с учётом порядка FK.
 * Важное правило платформы: не удаляем организации с активными контрактами,
 * поэтому сначала чистим таблицу контрактов.
 */
export async function resetTestDb(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(contracts);
    await tx.delete(attachments);
    await tx.delete(shares);
    await tx.delete(fileTrash);
    await tx.delete(files);
    await tx.delete(folders);
    await tx.delete(archivedDocuments);
    await tx.delete(organizationArchives);
    await tx.delete(organizationStorageUsage);
    await tx.delete(organizationSubscriptions);
    await tx.delete(subscriptionPlans);
    await tx.delete(projects);
    await tx.delete(organizationMembers);
    await tx.delete(organizations);
    await tx.delete(users);
  });
}
