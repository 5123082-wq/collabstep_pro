-- Migration 0014: Vacancy timezone and attachments

ALTER TABLE "vacancies" ADD COLUMN IF NOT EXISTS "timezone" TEXT;

CREATE TABLE IF NOT EXISTS "vacancy_attachments" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "vacancy_id" TEXT NOT NULL REFERENCES "vacancies"("id") ON DELETE CASCADE,
    "file_id" TEXT NOT NULL REFERENCES "file"("id") ON DELETE CASCADE,
    "created_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "vacancy_attachments_vacancy_id_idx" ON "vacancy_attachments" ("vacancy_id");
CREATE INDEX IF NOT EXISTS "vacancy_attachments_file_id_idx" ON "vacancy_attachments" ("file_id");
CREATE INDEX IF NOT EXISTS "vacancy_attachments_created_at_idx" ON "vacancy_attachments" ("created_at");
