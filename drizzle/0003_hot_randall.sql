CREATE TYPE "public"."expense_billing_cycle" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."expense_payment_method" AS ENUM('bankTransfer', 'cash', 'cheque', 'creditCard', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('oneTime', 'recurring');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "expense_type" DEFAULT 'oneTime' NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" varchar(100) NOT NULL,
	"vendor" varchar(255),
	"payment_method" "expense_payment_method" DEFAULT 'bankTransfer' NOT NULL,
	"notes" text,
	"payment_date" text,
	"billing_cycle" "expense_billing_cycle",
	"recurring_day" integer,
	"recurring_month" integer,
	"start_date" text,
	"end_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
