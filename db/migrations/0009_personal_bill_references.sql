-- Store bill account/reference numbers separately from the display name.
ALTER TABLE personal_bills ADD COLUMN IF NOT EXISTS reference_number varchar(180);
