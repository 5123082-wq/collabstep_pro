-- Migration 0009: User Project Templates
-- Creates table for user-defined project templates

CREATE TABLE IF NOT EXISTS "user_project_templates" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(50),
    "summary" TEXT,
    "created_at" TIMESTAMP DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- Create indexes for user_project_templates
CREATE INDEX IF NOT EXISTS "user_project_templates_user_id_idx" ON "user_project_templates" ("user_id");
CREATE INDEX IF NOT EXISTS "user_project_templates_created_at_idx" ON "user_project_templates" ("created_at");

