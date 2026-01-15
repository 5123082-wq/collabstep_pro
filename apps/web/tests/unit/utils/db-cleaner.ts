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
  performerCases,
  performerPortfolioItems,
  performerProfiles,
  performerRatings,
  projects,
  shares,
  subscriptionPlans,
  users,
  vacancies,
  vacancyAttachments,
  vacancyResponses
} from '@collabverse/api/db/schema';

/**
 * Очищает БД для unit/API тестов с учётом порядка FK.
 * Важное правило платформы: не удаляем организации с активными контрактами,
 * поэтому сначала чистим таблицу контрактов.
 * 
 * Удаляем без транзакции, чтобы избежать deadlock при параллельных тестах.
 */
export async function resetTestDb(): Promise<void> {
  // Performers-related tables (must be deleted before users/organizations)
  await db.delete(vacancyAttachments);
  await db.delete(vacancyResponses);
  await db.delete(vacancies);
  await db.delete(performerRatings);
  await db.delete(performerCases);
  await db.delete(performerPortfolioItems);
  await db.delete(performerProfiles);
  
  await db.delete(contracts);
  await db.delete(attachments);
  await db.delete(shares);
  await db.delete(fileTrash);
  await db.delete(files);
  await db.delete(folders);
  await db.delete(archivedDocuments);
  await db.delete(organizationArchives);
  await db.delete(organizationStorageUsage);
  await db.delete(organizationSubscriptions);
  await db.delete(subscriptionPlans);
  await db.delete(projects);
  await db.delete(organizationMembers);
  await db.delete(organizations);
  await db.delete(users);
}
