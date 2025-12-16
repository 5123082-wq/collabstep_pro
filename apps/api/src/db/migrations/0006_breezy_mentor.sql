CREATE TABLE "archived_document" (
	"id" text PRIMARY KEY NOT NULL,
	"archive_id" text NOT NULL,
	"original_document_id" text NOT NULL,
	"original_project_id" text NOT NULL,
	"project_name" text NOT NULL,
	"title" text NOT NULL,
	"type" text,
	"file_id" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"metadata" jsonb,
	"archived_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_archive" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"owner_id" text NOT NULL,
	"closed_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_archive_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "closure_reason" text;--> statement-breakpoint
ALTER TABLE "archived_document" ADD CONSTRAINT "archived_document_archive_id_organization_archive_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."organization_archive"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_archive" ADD CONSTRAINT "organization_archive_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_archive" ADD CONSTRAINT "organization_archive_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archived_document_archive_idx" ON "archived_document" USING btree ("archive_id");--> statement-breakpoint
CREATE INDEX "archived_document_expires_idx" ON "archived_document" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "organization_archive_owner_idx" ON "organization_archive" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "organization_archive_expires_idx" ON "organization_archive" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "organization_archive_status_idx" ON "organization_archive" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_status_idx" ON "organization" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_closed_at_idx" ON "organization" USING btree ("closed_at");