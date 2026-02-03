-- Migration: 0024_subscription_ai_limits
-- Description: Add AI agent limits to subscription plans

-- Add AI limit columns to subscription_plan table
ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_runs_per_day" INTEGER;
ALTER TABLE "subscription_plan" ADD COLUMN IF NOT EXISTS "ai_agent_concurrent_runs" INTEGER;

-- Update existing plans with AI limits (if plans exist)
UPDATE "subscription_plan" SET
  "ai_agent_runs_per_day" = 3,
  "ai_agent_concurrent_runs" = 1
WHERE "code" = 'free';

UPDATE "subscription_plan" SET
  "ai_agent_runs_per_day" = 50,
  "ai_agent_concurrent_runs" = 3
WHERE "code" = 'pro';

UPDATE "subscription_plan" SET
  "ai_agent_runs_per_day" = -1,
  "ai_agent_concurrent_runs" = 10
WHERE "code" = 'max';
