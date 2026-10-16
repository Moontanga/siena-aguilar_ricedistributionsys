-- Apply once in the Neon SQL Editor for the same database used by Vercel.
CREATE TABLE IF NOT EXISTS business_profile (
  id varchar(32) PRIMARY KEY DEFAULT 'main',
  business_name varchar(180) NOT NULL DEFAULT 'Siena-Aguilar Rice Distributor',
  contact_number varchar(40),
  contact_email varchar(254),
  facebook_url text,
  business_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO business_profile (id, business_name)
VALUES ('main', 'Siena-Aguilar Rice Distributor')
ON CONFLICT (id) DO NOTHING;
