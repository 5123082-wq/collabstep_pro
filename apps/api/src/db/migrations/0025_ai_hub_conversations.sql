-- Migration: 0025_ai_hub_conversations
-- Description: Add AI Hub support - direct conversations with AI agents

-- 1. Add allowDirectMessages field to ai_agent_config
ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "allow_direct_messages" BOOLEAN DEFAULT true;

-- 2. Create ai_conversation table for direct user-agent conversations
CREATE TABLE IF NOT EXISTS "ai_conversation" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "agent_config_id" TEXT NOT NULL REFERENCES "ai_agent_config"(id) ON DELETE CASCADE,
    "title" TEXT,
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create ai_conversation_message table for messages in direct conversations
CREATE TABLE IF NOT EXISTS "ai_conversation_message" (
    "id" TEXT PRIMARY KEY,
    "conversation_id" TEXT NOT NULL REFERENCES "ai_conversation"(id) ON DELETE CASCADE,
    "role" TEXT NOT NULL, -- 'user' | 'assistant'
    "content" TEXT NOT NULL,
    "metadata" JSONB, -- optional: for storing run_id, artifacts, etc.
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "ai_conversation_user_id_idx" ON "ai_conversation"("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversation_agent_config_id_idx" ON "ai_conversation"("agent_config_id");
CREATE INDEX IF NOT EXISTS "ai_conversation_last_message_at_idx" ON "ai_conversation"("last_message_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_conversation_message_conversation_id_idx" ON "ai_conversation_message"("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_conversation_message_created_at_idx" ON "ai_conversation_message"("created_at");

-- 5. Update Brandbook Agent to allow direct messages
UPDATE "ai_agent_config" SET "allow_direct_messages" = true WHERE "slug" = 'brandbook';
