-- Migration: brandbook agent runs and messages

CREATE TABLE "brandbook_agent_run" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "project_id" text,
  "task_id" text,
  "created_by" text NOT NULL,
  "status" text NOT NULL,
  "product_bundle" text NOT NULL,
  "preferences" jsonb,
  "output_language" text,
  "watermark_text" text,
  "contact_block" text,
  "logo_file_id" text,
  "pipeline_type" text,
  "output_format" text,
  "preview_format" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "brandbook_agent_message" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "brandbook_agent_artifact" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL,
  "file_id" text NOT NULL,
  "kind" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "brandbook_agent_run" ADD CONSTRAINT "brandbook_agent_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brandbook_agent_run" ADD CONSTRAINT "brandbook_agent_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "brandbook_agent_run" ADD CONSTRAINT "brandbook_agent_run_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "brandbook_agent_message" ADD CONSTRAINT "brandbook_agent_message_run_id_brandbook_agent_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."brandbook_agent_run"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "brandbook_agent_artifact" ADD CONSTRAINT "brandbook_agent_artifact_run_id_brandbook_agent_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."brandbook_agent_run"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brandbook_agent_artifact" ADD CONSTRAINT "brandbook_agent_artifact_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "brandbook_agent_run_organization_id_idx" ON "brandbook_agent_run" USING btree ("organization_id");
CREATE INDEX "brandbook_agent_run_project_id_idx" ON "brandbook_agent_run" USING btree ("project_id");
CREATE INDEX "brandbook_agent_run_created_by_idx" ON "brandbook_agent_run" USING btree ("created_by");
CREATE INDEX "brandbook_agent_run_status_idx" ON "brandbook_agent_run" USING btree ("status");

CREATE INDEX "brandbook_agent_message_run_id_idx" ON "brandbook_agent_message" USING btree ("run_id");
CREATE INDEX "brandbook_agent_message_created_at_idx" ON "brandbook_agent_message" USING btree ("created_at");

CREATE INDEX "brandbook_agent_artifact_run_id_idx" ON "brandbook_agent_artifact" USING btree ("run_id");
CREATE INDEX "brandbook_agent_artifact_file_id_idx" ON "brandbook_agent_artifact" USING btree ("file_id");
