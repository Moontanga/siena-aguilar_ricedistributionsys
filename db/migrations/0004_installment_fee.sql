ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "installment_fee" numeric(14, 2) DEFAULT '0' NOT NULL;
