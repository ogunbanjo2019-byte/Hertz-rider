# Ride Platform Backend

MVP Node.js/Express API for a CNG e-hailing platform serving rider, driver, and admin clients. Production persistence uses **Supabase Postgres** through a server-side JSONB-backed `app_records` table.

## Quick start

```bash
cp .env.example .env
npm install
npm test
npm run lint
npm start
```

The API runs on `http://localhost:4000` by default. Health check: `GET /health`. Copy `.env.example` to `.env` for local setup. Run [`SUPABASE_SCHEMA.sql`](./SUPABASE_SCHEMA.sql) once in the Supabase SQL Editor, then configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `JWT_SECRET` of at least 32 characters in production. Tests automatically use an in-memory provider.

The admin web console is served at `http://localhost:4000/admin/`. Development may seed a sample admin, but production never creates that predictable account; provision an admin through a controlled process.

## Architecture

The project uses a feature-based Express structure under `src/modules`. Each module owns its routes and business logic. The repository keeps the existing in-process controller contract and flushes changes to Supabase after API responses.

Core modules include authentication, drivers, verification, rides, payments, subscriptions, wallets, notifications, complaints, support, CNG, and admin operations.

## API

All public routes are versioned under `/api/v1`. Responses use:

```json
{"success": true, "message": "...", "data": {}, "error": null}
```

The driver frontend contract can be migrated to these canonical routes. Compatibility aliases are intentionally not added until the mobile team confirms the final contract.

## Driver capability routes

- **Approval:** the existing admin routes `PUT /api/v1/admin/drivers/:id/approve`, `reject`, and `suspend` update the driver gate used by `POST /api/v1/drivers/status`.
- **Verification:** `POST /api/v1/drivers/verification/nin`, `POST /api/v1/drivers/verification/document`, `POST /api/v1/drivers/verification/selfie`, `GET /api/v1/drivers/verification/status`.
- **Safety:** `POST /api/v1/drivers/sos/trigger` with `tripId`, `latitude`, and `longitude`.
- **Subscription:** `GET /api/v1/drivers/subscription/status`, `history`, and `POST /api/v1/drivers/subscription/pay` (the current MVP records a successful manual/provider reference payment; provider settlement remains a production integration task).
- **Wallet:** transactions, bank-account, withdraw, and withdrawals under `/api/v1/drivers/wallet`.
- **CNG:** log, history, summary, and unit-config under `/api/v1/drivers/cng`.
- **Daily verification:** `GET /api/v1/drivers/verification/daily-status` and multipart `POST /api/v1/drivers/verification/daily-check`.
- **Auth/app:** `POST /api/v1/auth/change-password`, `POST /api/v1/auth/send-otp`, `POST /api/v1/auth/verify-otp`, and public `GET /api/v1/app/version`.

Password reset is complete: `POST /api/v1/auth/forgot-password` creates a hashed, 30-minute, single-use token and sends a reset email; `POST /api/v1/auth/reset-password` consumes it. The reset page is served at `/reset-password`. Email notifications cover reset instructions, OTPs sent to email, payment receipts, password-change notices, and payout-status changes.

## Admin back-office

The admin console now includes executive metrics, driver clearance/document review, SOS response status, wallet payout review, dispatch radar data, CNG station summaries, audit logs, and authenticated CSV exports. The matching protected API routes are under `/api/v1/admin`.

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to persist all app collections in Supabase. Set `PAYSTACK_SECRET_KEY` and optionally `PAYSTACK_CALLBACK_URL` to enable Paystack checkout initialization and server-side transaction verification for rider payments. Credentials are read only from the server environment and are never sent to the browser.

Set `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`, or `EMAIL_PROVIDER=smtp` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`. In development, `EMAIL_PROVIDER=development` stores a preview in the `emailMessages` collection instead of sending external mail.

Uploads validate MIME type and size, store sensitive files in a private Supabase Storage bucket, retain metadata only, and use short-lived signed URLs. OTP and password-reset secrets are hashed at rest, expire, are single-use, and have dedicated request rate limits. In non-production, `send-otp` includes `developmentOtp` for testing; production requires a real email provider.

## Production checklist

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete launch runbook. The remaining work requires operator-owned DNS/provider credentials or infrastructure: verified email SPF/DKIM/DMARC, approved identity and payout providers, realtime transport, background workers, managed observability, backups/restore drills, staging UAT, and production deployment.
