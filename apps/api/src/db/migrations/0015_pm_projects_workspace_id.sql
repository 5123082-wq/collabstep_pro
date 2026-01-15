-- Migration: Add workspace_id column to pm_projects table
-- This column is used by pm-pg-adapter for project storage

ALTER TABLE pm_projects ADD COLUMN IF NOT EXISTS workspace_id TEXT;

-- Set default value for existing rows
UPDATE pm_projects SET workspace_id = 'default' WHERE workspace_id IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE pm_projects ALTER COLUMN workspace_id SET NOT NULL;
