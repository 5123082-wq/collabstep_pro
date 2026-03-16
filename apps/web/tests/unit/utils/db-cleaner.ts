import { sql } from 'drizzle-orm';
import { db } from '@collabverse/api/db/config';
import { memory, resetRepositoryCachesForTests } from '@collabverse/api';

/**
 * Очищает БД для unit/API тестов через TRUNCATE CASCADE.
 * Это снижает риски FK-ошибок при параллельных тестах.
 */
export async function resetTestDb(): Promise<void> {
  await db.execute(sql.raw(`
    DO $$
    BEGIN
      -- PM tables
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_projects') THEN
        TRUNCATE TABLE
          pm_project_chat_messages,
          pm_task_comments,
          pm_tasks,
          pm_project_members,
          pm_projects
        RESTART IDENTITY CASCADE;
      END IF;

      -- AI Agent tables
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_agent_configs') THEN
        TRUNCATE TABLE
          ai_conversation_messages,
          ai_conversations,
          brandbook_agent_artifacts,
          brandbook_agent_messages,
          brandbook_agent_runs,
          ai_agent_prompt_versions,
          ai_agent_configs
        RESTART IDENTITY CASCADE;
      END IF;

      -- Domain events
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'domain_events') THEN
        TRUNCATE TABLE domain_events RESTART IDENTITY CASCADE;
      END IF;
    END $$;
  `));

  await db.execute(sql`
    TRUNCATE TABLE
      vacancy_attachments,
      vacancy_responses,
      vacancies,
      performer_ratings,
      performer_cases,
      performer_portfolio_items,
      performer_profile,
      "userControl",
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
    RESTART IDENTITY CASCADE
  `);

  resetRepositoryCachesForTests();
  memory.PROJECTS = [];
  memory.PROJECT_MEMBERS = {};
  memory.TASKS = [];
  memory.TASK_COMMENTS = [];
  memory.PROJECT_CHAT_MESSAGES = [];
  memory.ATTACHMENTS = [];
  memory.FILES = [];
}
