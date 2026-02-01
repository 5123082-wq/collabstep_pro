-- Migration: brandbook agent artifacts preview metadata

ALTER TABLE "brandbook_agent_artifact"
  ALTER COLUMN "file_id" DROP NOT NULL;

ALTER TABLE "brandbook_agent_artifact"
  ADD COLUMN "storage_key" text,
  ADD COLUMN "storage_url" text,
  ADD COLUMN "filename" text,
  ADD COLUMN "mime_type" text,
  ADD COLUMN "size_bytes" bigint;
