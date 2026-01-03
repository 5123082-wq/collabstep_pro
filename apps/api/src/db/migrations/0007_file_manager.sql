CREATE TYPE "public"."share_scope" AS ENUM('view', 'download');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan_code" AS ENUM('free', 'pro', 'max');--> statement-breakpoint
CREATE TYPE "public"."folder_type" AS ENUM('project', 'task', 'result', 'custom');--> statement-breakpoint
CREATE TYPE "public"."attachment_entity_type" AS ENUM('project', 'task', 'comment', 'document', 'project_chat');--> statement-breakpoint
CREATE TABLE "folder" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"parent_id" text,
	"name" text NOT NULL,
	"type" "folder_type",
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"uploaded_by" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text NOT NULL,
	"sha256" text,
	"description" text,
	"folder_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"project_id" text NOT NULL,
	"linked_entity" "attachment_entity_type" NOT NULL,
	"entity_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "share" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"token" text NOT NULL,
	"scope" "share_scope" NOT NULL,
	"expires_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_trash" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"deleted_by" text NOT NULL,
	"deleted_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"retention_days" integer,
	"restored_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"code" "subscription_plan_code" NOT NULL,
	"name" text NOT NULL,
	"storage_limit_bytes" bigint,
	"file_size_limit_bytes" bigint,
	"trash_retention_days" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"starts_at" timestamp NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_storage_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"total_bytes" bigint DEFAULT 0 NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"last_calculated_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_parent_id_folder_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share" ADD CONSTRAINT "share_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share" ADD CONSTRAINT "share_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_trash" ADD CONSTRAINT "file_trash_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_trash" ADD CONSTRAINT "file_trash_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_trash" ADD CONSTRAINT "file_trash_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_storage_usage" ADD CONSTRAINT "organization_storage_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folder_organization_id_idx" ON "folder" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "folder_project_id_idx" ON "folder" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "folder_task_id_idx" ON "folder" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "folder_parent_id_idx" ON "folder" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "folder_type_idx" ON "folder" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "file_storage_key_idx" ON "file" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "file_organization_id_idx" ON "file" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "file_project_id_idx" ON "file" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "file_task_id_idx" ON "file" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "file_uploaded_by_idx" ON "file" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "file_folder_id_idx" ON "file" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "file_created_at_idx" ON "file" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attachment_file_id_idx" ON "attachment" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "attachment_project_id_idx" ON "attachment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "attachment_entity_idx" ON "attachment" USING btree ("linked_entity","entity_id");--> statement-breakpoint
CREATE INDEX "attachment_created_at_idx" ON "attachment" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "share_token_idx" ON "share" USING btree ("token");--> statement-breakpoint
CREATE INDEX "share_file_id_idx" ON "share" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "share_expires_at_idx" ON "share" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "share_created_at_idx" ON "share" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "file_trash_file_id_idx" ON "file_trash" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_trash_organization_id_idx" ON "file_trash" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "file_trash_expires_at_idx" ON "file_trash" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "file_trash_deleted_at_idx" ON "file_trash" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plan_code_idx" ON "subscription_plan" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_subscription_organization_id_idx" ON "organization_subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_subscription_plan_id_idx" ON "organization_subscription" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "organization_subscription_status_idx" ON "organization_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_subscription_expires_at_idx" ON "organization_subscription" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_storage_usage_organization_id_idx" ON "organization_storage_usage" USING btree ("organization_id");
