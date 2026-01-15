-- Migration 0012: Performers MVP tables and profile extension

-- Vacancies
CREATE TABLE IF NOT EXISTS "vacancies" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "organization_id" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "created_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "level" TEXT,
    "employment_type" TEXT,
    "work_format" TEXT[] DEFAULT '{}' NOT NULL,
    "reward_type" TEXT,
    "reward_data" JSONB,
    "language" TEXT,
    "deadline" TIMESTAMP,
    "requirements" TEXT[] DEFAULT '{}' NOT NULL,
    "responsibilities" TEXT[] DEFAULT '{}' NOT NULL,
    "test_task" TEXT,
    "payment_note" TEXT,
    "contact_name" TEXT,
    "contact_channel" TEXT,
    "status" TEXT DEFAULT 'draft' NOT NULL,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "vacancies_organization_id_idx" ON "vacancies" ("organization_id");
CREATE INDEX IF NOT EXISTS "vacancies_status_idx" ON "vacancies" ("status");

-- Vacancy responses
CREATE TABLE IF NOT EXISTS "vacancy_responses" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "vacancy_id" TEXT NOT NULL REFERENCES "vacancies"("id") ON DELETE CASCADE,
    "performer_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "message" TEXT,
    "status" TEXT DEFAULT 'pending' NOT NULL,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "vacancy_responses_vacancy_id_idx" ON "vacancy_responses" ("vacancy_id");
CREATE INDEX IF NOT EXISTS "vacancy_responses_performer_id_idx" ON "vacancy_responses" ("performer_id");

-- Performer ratings
CREATE TABLE IF NOT EXISTS "performer_ratings" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "performer_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "rater_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "project_id" TEXT,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "performer_ratings_performer_id_idx" ON "performer_ratings" ("performer_id");

-- Performer portfolio items
CREATE TABLE IF NOT EXISTS "performer_portfolio_items" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "performer_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "file_url" TEXT,
    "project_id" TEXT,
    "order" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP DEFAULT now()
);

-- Performer cases
CREATE TABLE IF NOT EXISTS "performer_cases" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "performer_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "project_id" TEXT,
    "outcome" TEXT,
    "created_at" TIMESTAMP DEFAULT now()
);

-- Extend performer_profile
ALTER TABLE "performer_profile" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT '{}' NOT NULL;
ALTER TABLE "performer_profile" ADD COLUMN IF NOT EXISTS "work_formats" TEXT[] DEFAULT '{}' NOT NULL;
ALTER TABLE "performer_profile" ADD COLUMN IF NOT EXISTS "portfolio_enabled" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "performer_profile" ADD COLUMN IF NOT EXISTS "handle" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "performer_profile_handle_idx" ON "performer_profile" ("handle");
