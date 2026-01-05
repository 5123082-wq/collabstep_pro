-- Migration 0010: Extend User Project Templates
-- Adds project_type, project_stage, and project_visibility columns

ALTER TABLE "user_project_templates"
ADD COLUMN IF NOT EXISTS "project_type" TEXT,
ADD COLUMN IF NOT EXISTS "project_stage" TEXT,
ADD COLUMN IF NOT EXISTS "project_visibility" TEXT;

