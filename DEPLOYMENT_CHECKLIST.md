# Production launch checklist

- [ ] Implement real authentication, secure sessions, password reset, and account bootstrap.
- [ ] Add server-side role and permission checks to every read/write operation.
- [ ] Replace demo state with Neon-backed product, sale, purchase, payment, customer, supplier, and expense operations.
- [ ] Implement atomic sale creation, stock locking, inventory movement ledger, idempotency keys, and transaction reversal.
- [ ] Add persistent purchase receiving and partial delivery support.
- [ ] Add payment allocations and customer/supplier balance statements.
- [ ] Implement weighted-average or FIFO costing consistently and document assumptions.
- [ ] Add real dashboard/report queries with timezone-safe date ranges.
- [ ] Add XLSX/PDF export if required; currently CSV is implemented in the UI.
- [ ] Configure Google Sheets OAuth/service access and sync retry/duplicate prevention if needed.
- [ ] Configure Neon backup/recovery and test a restore.
- [ ] Add service worker only with safe caching rules for private data; manifest is included.
- [ ] Add automated unit/integration tests and run `npm run build` in a configured environment.
- [ ] Review migrations, security headers, rate limiting, dependency alerts, and secrets.
- [ ] Test mobile installation on a real Android device and desktop browsers.
- [ ] Validate all calculations and reports against real business scenarios before launch.
