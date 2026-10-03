# SwitchRide production deployment runbook

This service is **production-hardened but not deployable without operator credentials and provider approvals**. Never commit `.env`, Supabase service-role keys, Paystack secrets, SMTP credentials, or identity-provider secrets.

## 1. Configure the production environment

Set these server-only variables in the hosting provider secret manager:

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Project URL and server-only service-role key |
| `SENSITIVE_STORAGE_BUCKET` | Private bucket, normally `sensitive-documents` |
| `PAYSTACK_SECRET_KEY` | Live Paystack secret; configure webhook URL `/api/v1/payments/webhooks/paystack` |
| `EMAIL_PROVIDER` | `resend` or `smtp` |
| `RESEND_API_KEY` or `SMTP_*` | Provider credentials |
| `EMAIL_FROM` | Address on the verified sending domain |
| `APP_PUBLIC_URL` | Exact HTTPS public URL used in password-reset links |
| `CORS_ORIGIN` | Exact HTTPS frontend origin, never `*` |
| `JWT_SECRET` | At least 32 random characters; use a secret manager |

The app fails fast in production when required values are missing or insecure.

## 2. Supabase and private document storage

1. Run `SUPABASE_SCHEMA.sql` in the Supabase SQL editor.
2. Confirm `sensitive-documents` is private.
3. Confirm only the API service role can access objects; do not expose the service-role key to any client.
4. Existing uploads must be migrated from any legacy `contentBase64` fields before deleting them. The current upload routes validate MIME type/size, upload to private storage, store only metadata, and issue short-lived signed URLs.
5. Configure retention/deletion for rejected or expired identity files according to the platform privacy policy.

## 3. Email deployment and DNS

For the chosen provider, verify the sending domain and publish the exact DNS records they supply:

- SPF TXT record at the provider-specified host.
- DKIM CNAME/TXT record(s) at the provider-specified host(s).
- DMARC TXT record at `_dmarc.your-domain`, starting with a monitored policy such as `p=none`, then move to quarantine/reject after reviewing reports.

Run password reset, OTP, withdrawal receipt, payment receipt, and payout status tests using test accounts. Confirm links use `APP_PUBLIC_URL`, messages are delivered, and provider logs show accepted mail.

## 4. Paystack hardening

- Register `https://api.example.com/api/v1/payments/webhooks/paystack` in Paystack.
- The endpoint verifies `x-paystack-signature` with HMAC-SHA512, checks the transaction amount, and is idempotent for duplicate events.
- Test initialize, verify, signed `charge.success`, duplicate webhook, wrong amount, failed payment, refund, and dispute workflows in test mode.
- Add provider-side reconciliation and alerting for payments stuck in `pending`, `failed`, or `amount_mismatch`.

## 5. Identity verification and payouts

The backend now provides provider-neutral identity checks, manual-review statuses, a payout adapter, retryable payout jobs, and an admin process endpoint. Set `IDENTITY_PROVIDER` and `IDENTITY_PROVIDER_API_KEY` only after choosing an approved provider; without them, checks remain safely in `manual_review`. Paystack Transfers are the default payout adapter once you configure the Paystack credentials and verified bank-account data. Provider onboarding, regulatory approval, and final credentials remain operator work.

## 6. Operations, realtime, and observability

The backend now exposes authenticated SSE ride streams at `/api/v1/realtime/rides/:rideId/events`, emits ride lifecycle events, includes request IDs/metrics in health responses, and runs a retryable in-process job worker for payouts. For multi-instance production, replace or complement the internal bus/worker with Supabase Realtime and a shared queue, and connect managed error tracking/log retention/alerts.

## 7. Staging and launch gates

```bash
npm ci
npm run lint
npm test
npm audit --omit=dev
npm start
```

Staging gates: real Supabase integration tests, Paystack test-mode transactions, real email delivery, large-file tests, concurrent ride assignment, SOS escalation, security testing, admin UAT, and restore test. Production gates: HTTPS certificate/domain, DNS records, rotated secrets, replacement of seeded admin credentials, exact CORS origin, monitoring, backup verification, and rollback plan.

Use `.env.staging.example` and [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md) to create the staging environment and record sign-off.

## Hosting example

Create a Node web service with build command `npm ci`, start command `npm start`, and health path `/health`. Bind to the provider-supplied `PORT` on `0.0.0.0`. The archive contains the backend/admin console only; configure the separate frontend with `VITE_API_BASE_URL=https://api.example.com/api/v1`.
