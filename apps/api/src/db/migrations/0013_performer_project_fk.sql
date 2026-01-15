-- Migration 0013: Add FK for performer project references to pm_projects
-- Guards are included to prevent failure if pm_projects is not yet created.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pm_projects'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'performer_ratings_project_id_fk'
    ) THEN
      ALTER TABLE "performer_ratings"
        ADD CONSTRAINT "performer_ratings_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'performer_portfolio_items_project_id_fk'
    ) THEN
      ALTER TABLE "performer_portfolio_items"
        ADD CONSTRAINT "performer_portfolio_items_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'performer_cases_project_id_fk'
    ) THEN
      ALTER TABLE "performer_cases"
        ADD CONSTRAINT "performer_cases_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "pm_projects"("id") ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
