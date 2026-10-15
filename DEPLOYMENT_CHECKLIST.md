# Deployment checklist — Siena-Aguilar Rice Distribution

## Before deploying the updated app

- [ ] Back up the Neon database.
- [ ] In Neon SQL Editor, run `db/migrations/0001_manager_credit_catalog.sql` once if not already applied. It adds the `manager` enum role and the `sales.customer_name` column.
- [ ] Run `db/migrations/0002_usernames.sql` once if not already applied. It adds usernames for existing accounts.
- [ ] Run `db/migrations/0003_unbounded_user_fields.sql` once. It removes database column-length limits for account names, usernames, and emails.
- [ ] Confirm the existing `owner` account (displayed as Admin) still exists and is active.
- [ ] In Vercel → Project → Settings → Environment Variables, verify `DATABASE_URL` and `SESSION_SECRET` are configured for Production.
- [ ] Ensure `SESSION_SECRET` is a long random value (at least 32 characters). Keep it private.
- [ ] Push the updated source to GitHub and wait for Vercel to deploy.

## After deployment

- [ ] Open `/` in a private/incognito browser and confirm the public catalog loads from Neon.
- [ ] Log in at `/login` using the Admin account; confirm it redirects to `/dashboard` and shows all operational modules and User Accounts.
- [ ] Create a Manager account with a short password and confirm the eye icon reveals/hides it.
- [ ] Edit the Admin account details, username, email, and password; confirm the new credentials work.
- [ ] Create a Manager account and sign out.
- [ ] Sign in as Manager and add a real rice product with current stock, sack weight, cost, and prices.
- [ ] Confirm that product appears in the public catalog.
- [ ] Test a small sale and confirm stock is deducted and the sale is listed.
- [ ] Test a credit sale and record a partial payment; confirm the balance remains open and payment history is recorded.
- [ ] Record a purchase and an expense; confirm reports reflect them.
- [ ] Verify that Manager cannot access `/api/users` and that Admin can access operational APIs.
- [ ] Verify the browser tab shows the rice icon.

Do not test with large or financially significant transactions until the deployment and database changes are confirmed. The source package should receive a successful Vercel build before being treated as production-ready.
