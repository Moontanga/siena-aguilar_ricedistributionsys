# Siena-Aguilar Rice Distribution

A Next.js + TypeScript application foundation for a rice inventory, sales, and distribution system. Includes a responsive 3D-inspired dashboard, interactive demo inventory and POS workflows, CSV exports, PWA manifest, Neon/PostgreSQL Drizzle schema, and deployment configuration examples.

> **Important status note:** This package is an initial application build, not a production-ready accounting system. The dashboard currently uses illustrative in-browser demo data. The schema and database connection foundation are included, but authentication, persistent CRUD endpoints, atomic sale/purchase workflows, Google Sheets OAuth, scheduled backup, and production testing must be implemented and verified before using it for live transactions. Do not enter real business data until those are complete.

## Requirements

- Node.js 20.9+ (Node 22 LTS recommended)
- npm
- A Neon PostgreSQL project for database-backed development

## Local setup

1. Extract the project archive and open its directory.
2. Install packages:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and configure `DATABASE_URL` and a long random `SESSION_SECRET`.
4. Generate and apply database migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000`.

## Included now

- Responsive desktop/mobile navigation and rice-business dashboard
- 3D-inspired emerald/forest/gold visual identity
- Demo rice product table with search
- Add product flow for the current browser session
- POS modal with kilogram/sack conversion, separate per-sack pricing, total calculation, and insufficient-stock check
- Demo sales history and customer balance figures
- Inventory and sales CSV exports
- Reports and backup readiness pages
- PWA manifest and icon
- Drizzle schema for users, products, customers, suppliers, sales, sale items, purchases, purchase items, inventory movements, payments, expenses, and audit logs
- Neon connection helper and example environment configuration

## Critical business rules

- Inventory is tracked in kilograms as the canonical quantity.
- Each rice product has its own sack weight.
- Sack pricing can differ from kilogram pricing.
- Sale stock deductions must be atomic with the sale record in production.
- Never silently delete posted financial records; use reversals and audit trails.
- CSV exports are not database backups.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Create a Neon PostgreSQL database and set `DATABASE_URL` in Vercel project environment variables. Use the pooled connection string for normal application queries.
4. Set `SESSION_SECRET` and `APP_URL` as appropriate for the deployment.
5. Run reviewed migrations against the intended database.
6. Deploy and test in a non-production environment before importing business data.

## Security warning

Do not expose database credentials in client-side code, commit `.env.local`, or use the demo data as a live source of truth. Before production use, implement and test server-side authentication and role authorization, database-backed route handlers/actions, transaction-safe stock operations, rate limiting, audit logging, secure export endpoints, and backup/restore procedures.

## Initial owner login

After applying migrations and setting `DATABASE_URL`, create the first owner from a trusted local terminal. Do not add administrator creation to a public signup route.

```bash
ADMIN_NAME="System Owner" ADMIN_EMAIL="owner@example.com" ADMIN_PASSWORD="use-a-long-unique-password" npm run admin:create
```

The login page is `/login`. The dashboard route and API endpoints are guarded by a signed, HTTP-only session cookie. Database-backed login requires the configured Neon database and the first owner account.

## Available database API foundation

Authenticated API routes are included for login/logout/current session, listing/creating products, updating/archiving products, listing/creating sales, listing/creating purchase receipts, recording expenses, and aggregate reports. These endpoints require the Neon database and a valid owner/staff session. The visible dashboard still uses local demo state and is not yet wired to these endpoints; this distinction is deliberate and documented so the demo interface is not mistaken for live persisted records.
