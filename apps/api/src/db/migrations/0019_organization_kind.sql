-- Migration 0019: Organization kind
DO $$
BEGIN
    CREATE TYPE "organization_kind" AS ENUM ('personal', 'business');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "kind" "organization_kind" DEFAULT 'business' NOT NULL;

UPDATE "organization" SET "kind" = 'business' WHERE "kind" IS NULL;
