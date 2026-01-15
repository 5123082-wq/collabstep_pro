import { sql } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';

/**
 * Очищает БД для unit/API тестов через TRUNCATE CASCADE.
 * Это снижает риски FK-ошибок при параллельных тестах.
 */
export async function resetTestDb(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      vacancy_attachments,
      vacancy_responses,
      vacancies,
      performer_ratings,
      performer_cases,
      performer_portfolio_items,
      performer_profile,
      contract,
      attachment,
      share,
      file_trash,
      file,
      folder,
      archived_document,
      organization_archive,
      organization_storage_usage,
      organization_subscription,
      subscription_plan,
      project,
      organization_member,
      organization,
      "user"
    CASCADE
  `);
}
