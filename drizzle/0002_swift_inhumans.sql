CREATE TYPE "public"."additional_payment_category" AS ENUM('bonus', 'deduction', 'advance', 'commission', 'allowance', 'other');--> statement-breakpoint
CREATE TABLE "additional_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"category" "additional_payment_category" DEFAULT 'bonus' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_type" "payment_method" DEFAULT 'bankTransfer' NOT NULL,
	"month" varchar(2) NOT NULL,
	"year" integer NOT NULL,
	"status" "payroll_status" DEFAULT 'generated' NOT NULL,
	"notes" text,
	"payment_date" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
