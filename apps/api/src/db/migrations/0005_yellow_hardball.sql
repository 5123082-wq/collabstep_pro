-- Data migration: normalize organization membership `user_id` to canonical `user.id`
-- Context: legacy/demo flows could store email in `organization_member.user_id`.
--
-- IMPORTANT: Run this migration before relying on unique (organization_id, user_id).

-- 1) Convert legacy email stored in organization_member.user_id to canonical user.id
UPDATE "organization_member" AS m
SET "user_id" = u."id"
FROM "user" AS u
WHERE m."user_id" LIKE '%@%'
  AND lower(trim(m."user_id")) = lower(trim(u."email"));
--> statement-breakpoint

-- 2) Ensure that org owner has role=owner (authoritative source: organization.owner_id)
UPDATE "organization_member" AS m
SET "role" = 'owner'
FROM "organization" AS o
WHERE m."organization_id" = o."id"
  AND m."user_id" = o."owner_id"
  AND m."role" IS DISTINCT FROM 'owner';
--> statement-breakpoint

-- 3) Deduplicate by (organization_id, user_id) after normalization.
-- Keep the "best" row by:
--   status: active > inactive > blocked
--   role: owner > admin > member > viewer
--   recency: updated_at (fallback created_at)
WITH ranked AS (
  SELECT
    m."id",
    row_number() OVER (
      PARTITION BY m."organization_id", m."user_id"
      ORDER BY
        CASE m."status"
          WHEN 'active' THEN 3
          WHEN 'inactive' THEN 2
          WHEN 'blocked' THEN 1
          ELSE 0
        END DESC,
        CASE m."role"
          WHEN 'owner' THEN 4
          WHEN 'admin' THEN 3
          WHEN 'member' THEN 2
          WHEN 'viewer' THEN 1
          ELSE 0
        END DESC,
        COALESCE(m."updated_at", m."created_at") DESC,
        m."id" DESC
    ) AS rn
  FROM "organization_member" AS m
)
DELETE FROM "organization_member" AS m
USING ranked AS r
WHERE m."id" = r."id"
  AND r.rn > 1;
--> statement-breakpoint

-- 4) Enforce uniqueness (safe if rerun).
DROP INDEX IF EXISTS "organization_member_org_user_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_org_user_idx" ON "organization_member" USING btree ("organization_id","user_id");