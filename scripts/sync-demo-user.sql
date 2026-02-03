-- Sync demo user to AI database for AI Hub functionality
-- This user is needed because ai_conversation has FK to user table

INSERT INTO "user" (id, email, name, "isAi", "createdAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin.demo@collabverse.test',
  'Admin Demo',
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  "isAi" = EXCLUDED."isAi";
