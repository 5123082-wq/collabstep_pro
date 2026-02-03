-- Migration: Add blocks column to ai_agent_prompt_version
-- Allows dynamic prompt blocks with names matching codebase (intake, logoCheck, generate, qa, followup)

ALTER TABLE "ai_agent_prompt_version" ADD COLUMN "blocks" jsonb;

-- Migrate existing data: convert prompts object to blocks array
UPDATE "ai_agent_prompt_version"
SET "blocks" = (
  SELECT jsonb_agg(block ORDER BY block->>'order')
  FROM (
    SELECT jsonb_build_object(
      'id', gen_random_uuid()::text,
      'order', 1,
      'name', 'intake',
      'content', prompts->>'intake',
      'stepKey', 'intake'
    ) AS block
    WHERE prompts->>'intake' IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid()::text,
      'order', 2,
      'name', 'logoCheck',
      'content', prompts->>'logoCheck',
      'stepKey', 'logoCheck'
    )
    WHERE prompts->>'logoCheck' IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid()::text,
      'order', 3,
      'name', 'generate',
      'content', prompts->>'generate',
      'stepKey', 'generate'
    )
    WHERE prompts->>'generate' IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid()::text,
      'order', 4,
      'name', 'qa',
      'content', prompts->>'qa',
      'stepKey', 'qa'
    )
    WHERE prompts->>'qa' IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid()::text,
      'order', 5,
      'name', 'followup',
      'content', prompts->>'followup',
      'stepKey', 'followup'
    )
    WHERE prompts->>'followup' IS NOT NULL
  ) sub
)
WHERE prompts IS NOT NULL;
