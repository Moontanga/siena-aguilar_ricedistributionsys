# Siena-Aguilar Rice Distributor

A Next.js 15 + TypeScript business-to-consumer rice distribution app using Neon PostgreSQL and Drizzle ORM. The public homepage is a shareable rice catalog; the secure dashboard is database-backed and separates Admin account administration from Manager operations.

## Current functionality

- Public catalog at `/` with active rice products, prices per kg/per sack, availability, search, and inquiry links.
- Secure login at `/login`; successful login redirects to `/dashboard`.
- Admin (`admin` or legacy `owner` database role): access all operational modules and create, edit, or deactivate Admin/Manager accounts. Account deactivation preserves transaction history. At least one active Admin is required.
- Manager (`manager` database role): database-backed rice inventory, pricing, stock, sales/POS, purchases/stock receipts, expenses, reports, and credit ledger.
- Stock is tracked in kg; each product has its own sack weight and optional separate sack price.
- Sale posting locks stock rows and commits the sale, sale lines, stock deductions, movement records, and initial payment together.
- Credit ledger records every payment separately and calculates the remaining amount. Partial payments do not close a balance until paid in full.
- Audit log entries for important actions.
- Browser tab icon from `/public/icon.svg`.

## Setup

Requirements: Node.js 20.9+ (Node 22 LTS recommended), npm, and a Neon PostgreSQL database.

1. Install packages with `npm install`.
2. Create `.env.local` (or `.env` for scripts) with `DATABASE_URL` and `SESSION_SECRET` (a random value at least 32 characters long). Do not commit either file.
3. Apply the existing database schema/migrations if this is a fresh database.
4. For an existing deployment created from the initial version, open Neon SQL Editor and run the contents of `db/migrations/0001_manager_credit_catalog.sql` **once**. This adds the `manager` role and the sale's buyer-name snapshot. Do not run this step repeatedly as a substitute for migrations.
5. Ensure the `owner` account exists, then run `npm run dev`.
6. Open `http://localhost:3000/` for the public catalog or `/login` for staff access.

## Environment variables

- `DATABASE_URL`: Neon PostgreSQL connection string for the intended database.
- `SESSION_SECRET`: long random secret, minimum 32 characters.
- `APP_URL`: optional deployment URL.

Set the same required variables in Vercel Project Settings → Environment Variables. Redeploy after changing Vercel environment variables. Never push `.env` or `.env.local` to GitHub.

## Roles

- `owner` is displayed as **Admin**. It can access account administration and manage users; it can access operational APIs.
- `manager` can manage business records but cannot access user-management APIs or create accounts.
- Existing legacy roles (`cashier` and `inventory`) are retained in the database enum for compatibility, but the current dashboard permissions are designed for `admin`/`owner` and `manager` accounts. Use Admin account management to assign either role.

## Public catalog

Share the production site's root URL with customers. The catalog only lists active products and does not expose exact stock quantities or purchase costs. Before promoting it publicly, configure a real business phone/WhatsApp number and business contact details in `app/page.tsx`.

## Data safety

The old browser-only sample dashboard was removed from the active UI. No sample inventory or sales are loaded into the new dashboard. The new app reads real records from Neon. This does not automatically delete existing database records; inspect your database before running any destructive cleanup. Keep the existing Admin account.

Posted financial records should be reversed or adjusted with audited workflows rather than silently deleted. Back up Neon before applying schema changes or cleaning test transactions.

## Build and deploy

```bash
npm run build
```

Push reviewed changes to GitHub to trigger Vercel deployment. Schema changes must be applied to Neon separately; a Git push alone does not alter the database schema.


## Username sign-in update

Run `db/migrations/0004_account_profile_repair.sql` once in the Neon SQL Editor for the exact database configured in Vercel's `DATABASE_URL`. It consolidates the account-related schema repair (username column, manager role, case-insensitive username uniqueness, and customer name on sales). It is safe to re-run. If the old migrations 0001–0003 were not applied, this repair covers the account fields needed by the current app; keep the earlier migration files in the project. Existing accounts receive a username based on the part of their email before `@`; if needed, a short suffix is added to keep usernames unique. Existing users can sign in with either their username or registered email address. New accounts require a name, unique username, valid unique email, and a non-empty password; there are no application-level minimum or maximum character rules for those text fields. Passwords are securely hashed and the password visibility eye toggle is available on login and account forms. Users can update their own name, username, registered email, and password in the My profile tab. Login accepts either username or registered email.

## Sales and purchase trash + delivery fee update

Before deploying the latest dashboard changes, run `db/migrations/0001_sales_purchases_trash_delivery.sql` once in the Neon SQL Editor for the same database used by Vercel's `DATABASE_URL`. This adds the sale delivery-fee field and recoverable-trash metadata for sales and purchases. The migration uses `IF NOT EXISTS` and is safe to re-run. Then push/deploy the app changes from GitHub.

## Expense editing and Trash update

Before deploying expense editing, restore, Trash, and permanent deletion, run `db/migrations/0002_expenses_trash.sql` once in the Neon SQL Editor for the same database used by Vercel's `DATABASE_URL`. It adds the `deleted_at` and `deleted_by` fields used to keep deleted expenses recoverable. The migration uses `IF NOT EXISTS` and is safe to re-run. Expenses moved to Trash are excluded from active expense listings and report totals; permanent deletion is only allowed from Trash.
