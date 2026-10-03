# Ride Platform Backend — Frontend Handoff

## Current readiness

The backend is ready for **local frontend integration and MVP flow testing**. Production persistence is now handled by Supabase Postgres through the API; the frontend never connects directly with the service-role key. It is not production-complete yet because password-reset and payment verification are placeholders, and provider webhooks, realtime ride events, storage, and observability still need to be implemented.

## Start the API locally

```bash
cp .env.example .env
npm install
npm test
npm run lint
npm start
```

The API listens on `http://localhost:4000`. The frontend base URL is:

```text
http://localhost:4000/api/v1
```

The admin back-office is available at `http://localhost:4000/admin/`. It uses the same admin JWT flow and covers dashboard metrics, driver verification review, SOS response, payout review, dispatch radar, CNG summaries, audit logs, and CSV exports.

Health check:

```text
GET http://localhost:4000/health
```

Set `CORS_ORIGIN` to the frontend origin. Multiple origins can be comma-separated, for example `http://localhost:3000,http://localhost:5173`.

## Authentication

Register or log in, then send the returned token on every protected request:

```http
Authorization: Bearer <accessToken>
```

Register:

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Rider One",
  "email": "rider@example.com",
  "phone": "+234800000001",
  "password": "Password123!",
  "role": "rider"
}
```

Login accepts either `email` or `phone` plus `password`:

```http
POST /auth/login
Content-Type: application/json

{"email":"rider@example.com","password":"Password123!"}
```

Password reset uses `POST /auth/forgot-password` with `{ "email": "..." }`. The emailed link opens `/reset-password?token=...`, which submits the new password to `POST /auth/reset-password`. Reset tokens are hashed, expire after 30 minutes, and are single-use.

All responses use this envelope:

```json
{"success":true,"message":"...","data":{},"error":null}
```

Validation and authorization errors use `success: false` and an error object with a stable `code`.

## Main frontend flows

| Flow | Endpoint sequence |
|---|---|
| Rider requests a ride | `POST /rides` → `GET /rides/:id` → `POST /rides/:id/cancel` or wait for status changes |
| Driver onboarding | `POST /drivers/documents` (multipart field `document`) → `POST /drivers/identity-verification` → admin approval |
| Driver availability | `POST /drivers/status` with `{ "isOnline": true, "latitude": 6.5, "longitude": 3.3 }` |
| Driver trip | `POST /rides/:id/accept` → `/arrived` → `/start` → `/complete` |
| Driver subscription | `GET /subscriptions/status` → `POST /subscriptions/pay` |
| Driver wallet | `GET /wallet/summary` → `POST /wallet/bank-account` → `POST /wallet/withdraw` |
| Rider payment | `POST /payments/initialize` after ride completion → `POST /payments/verify/:id` after provider confirmation |
| Support | `GET/POST /support/tickets`, `POST /complaints`, `GET /notifications` |

Ride status values are `requested`, `accepted`, `arrived`, `in_progress`, `completed`, and `cancelled`.

## Sending this to frontend

Share the repository folder (or a Git branch/PR) containing `src/`, `test/`, `package.json`, `package-lock.json`, `openapi.yaml`, `.env.example`, and this file. Do **not** send `.env`, JWT secrets, payment keys, or database credentials. The frontend team should run the setup commands above and configure its own `.env` with:

```text
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

For a deployed environment, replace that value with the HTTPS API URL and add the deployed frontend origin to the backend `CORS_ORIGIN` setting.

## Frontend API client example

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error?.code || body.message);
  return body.data;
}
```

For document upload, use `FormData` and omit the `Content-Type` header so the browser supplies the multipart boundary.

## Acceptance checklist

- `npm test` passes.
- `npm run lint` passes.
- `GET /health` returns HTTP 200.
- Rider registration/login returns an access token.
- Rider cannot access driver-only endpoints.
- An approved, subscribed, online driver can complete the ride lifecycle.
- The frontend uses the response envelope and sends the bearer token.

## Known limitations before production

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for persistent storage. Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_CALLBACK_URL` for Paystack checkout and server-side verification. Set `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY`, or use the SMTP settings in `.env.example`. Implement signed Paystack webhooks before production, add persistent ride events/realtime transport, configure object storage for documents, add audit/observability, tune Supabase indexes and connection pooling, and deploy behind HTTPS with managed secrets.
