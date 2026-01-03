-- Migration 0008: Multi-Organization Premium Feature
-- Adds isPrimary flag to organization_member and user_subscription table

-- Add isPrimary column to organization_member
ALTER TABLE "organization_member" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false NOT NULL;

-- Create index for primary organization lookup
CREATE INDEX IF NOT EXISTS "organization_member_primary_user_idx" ON "organization_member" ("user_id", "is_primary");

-- Set isPrimary for first organization of each owner (based on creation date)
UPDATE "organization_member" om
SET "is_primary" = true
WHERE om."role" = 'owner'
AND om."created_at" = (
  SELECT MIN("created_at") 
  FROM "organization_member" 
  WHERE "user_id" = om."user_id" AND "role" = 'owner'
);

-- Create user_subscription table
CREATE TABLE IF NOT EXISTS "user_subscription" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "plan_code" "subscription_plan_code" DEFAULT 'free' NOT NULL,
    "max_organizations" INTEGER DEFAULT 1 NOT NULL,
    "expires_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now()
);

-- Create indexes for user_subscription
CREATE UNIQUE INDEX IF NOT EXISTS "user_subscription_user_id_idx" ON "user_subscription" ("user_id");
CREATE INDEX IF NOT EXISTS "user_subscription_plan_code_idx" ON "user_subscription" ("plan_code");
CREATE INDEX IF NOT EXISTS "user_subscription_expires_at_idx" ON "user_subscription" ("expires_at");

-- Create default free subscription for all existing users who don't have one
INSERT INTO "user_subscription" ("id", "user_id", "plan_code", "max_organizations")
SELECT 
    gen_random_uuid()::text,
    u."id",
    'free',
    1
FROM "user" u
WHERE NOT EXISTS (
    SELECT 1 FROM "user_subscription" us WHERE us."user_id" = u."id"
);

