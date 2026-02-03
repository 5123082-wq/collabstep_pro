-- Migration: 0023_agent_identity
-- Description: Add is_ai flag to users table and user_id to ai_agent_config table
-- This allows AI agents to have corresponding user identities

-- Add is_ai column to user table (nullable with default false)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_ai" BOOLEAN DEFAULT false;

-- Add user_id column to ai_agent_config table (nullable FK to users)
ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "user_id" TEXT REFERENCES "user"(id);

-- Create index for efficient lookups by user_id
CREATE INDEX IF NOT EXISTS "ai_agent_config_user_id_idx" ON "ai_agent_config"("user_id");
