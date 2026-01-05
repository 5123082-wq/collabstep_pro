-- Migration 0011: Project Template Tasks
-- Creates table for tasks within project templates

CREATE TABLE IF NOT EXISTS "project_template_tasks" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "template_id" TEXT NOT NULL,
    "parent_task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "default_status" TEXT NOT NULL DEFAULT 'new',
    "default_priority" TEXT,
    "default_labels" TEXT[] DEFAULT '{}',
    "offset_start_days" INTEGER NOT NULL DEFAULT 0,
    "offset_due_days" INTEGER,
    "estimated_time" INTEGER,
    "story_points" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- Create indexes for project_template_tasks
CREATE INDEX IF NOT EXISTS "project_template_tasks_template_id_idx" ON "project_template_tasks" ("template_id");
CREATE INDEX IF NOT EXISTS "project_template_tasks_parent_task_id_idx" ON "project_template_tasks" ("parent_task_id");
CREATE INDEX IF NOT EXISTS "project_template_tasks_template_position_idx" ON "project_template_tasks" ("template_id", "position");

-- Foreign key constraint for parent_task_id (self-reference)
ALTER TABLE "project_template_tasks"
ADD CONSTRAINT "project_template_tasks_parent_task_id_fk" 
FOREIGN KEY ("parent_task_id") REFERENCES "project_template_tasks"("id") ON DELETE CASCADE;

-- Note: template_id references user_project_templates or admin templates
-- For admin templates (in memory), we'll handle this separately
-- For user templates, we can add FK constraint later if needed:
-- ALTER TABLE "project_template_tasks"
-- ADD CONSTRAINT "project_template_tasks_template_id_fk" 
-- FOREIGN KEY ("template_id") REFERENCES "user_project_templates"("id") ON DELETE CASCADE;

