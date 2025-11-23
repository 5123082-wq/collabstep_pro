CREATE TYPE "public"."contract_status" AS ENUM('offer', 'accepted', 'funded', 'completed', 'paid', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'RUB');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdrawal', 'payment', 'refund', 'payout');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('user', 'organization');--> statement-breakpoint
CREATE TABLE "contract" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"performer_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'RUB' NOT NULL,
	"status" "contract_status" DEFAULT 'offer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" "wallet_type" NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"currency" "currency" DEFAULT 'RUB' NOT NULL,
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_performer_id_user_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_task_idx" ON "contract" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "contract_performer_idx" ON "contract" USING btree ("performer_id");--> statement-breakpoint
CREATE INDEX "contract_org_idx" ON "contract" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transaction_wallet_idx" ON "transaction" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transaction_reference_idx" ON "transaction" USING btree ("reference_id","reference_type");--> statement-breakpoint
CREATE INDEX "wallet_entity_idx" ON "wallet" USING btree ("entity_id","entity_type");