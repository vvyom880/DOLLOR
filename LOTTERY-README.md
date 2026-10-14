# $ DOLLOR Lottery Module — Setup and Status

## Current implementation
- `/lottery.html`: responsive branded landing page, currently **verified sign-in required placeholder** (no public ticket records exposed).
- `/lottery-admin.html`: admin interface for usernames, CSV/XLSX preview/import, settings, prefixes, draws, preview/issuance, paginated ticket reports, CSV export, cancellation and audit.
- `/api/admin/lottery/[...path].js`: Vercel serverless API. Every route requires `Authorization: Bearer <ADMIN_PASSWORD>`. Use a strong unique admin password and protect the admin page via additional access controls.
- `/lottery-setup.sql`: PostgreSQL/Supabase schema, RLS, atomic issuance RPC and audited soft cancellation.

## Deploy
1. Run **lottery-setup.sql** in your Supabase project's SQL editor **after reviewing it**.
2. Confirm Vercel environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`. The service-role key must remain server-side only.
3. Redeploy from GitHub. Open `/lottery-admin.html`, enter admin password, create allowed two-digit prefixes (e.g. 31,32,45,46), create a draw, and import users.
4. Use Generate to preview then issue tickets. Amount must divide the current ticket price exactly.
5. Open `/lottery.html` from the footer.

## Security and outstanding work — DO NOT treat as production-ready
- The current existing website admin uses a shared password; individual administrator identities, MFA, approval workflow and session-based RBAC **are not implemented**. `X-Admin-Id` is not verified and is insufficient for trustworthy identity audit. Upgrade to authenticated admin sessions before use with real money.
- **Verified end-user sign-in and /api/lottery/my-tickets are not implemented**; public lookup is intentionally disabled to protect ticket privacy.
- Ticket replacement/correction workflow, finalized-draw approval workflow and dual-admin approval are **not implemented**.
- Number generation is cryptographically secure in Node, but issuance preview is not a reservation; active-number uniqueness is enforced by database constraint. High-concurrency collision retries and exhaustive number-space accounting need strengthening.
- The current admin UI supports CSV export of the **currently loaded page only**, not full-date-range export; Excel report export and financial reconciliation remain to implement.
- CSV/XLSX parser is loaded from an external CDN; pin/package it for production and validate import files server-side. Current import is not fully transactional.
- Bulk cancellation count currently reads up to 100,000 matching rows; do not use it for larger scopes without exact server-side count and batching.
- Request rate limits, audit immutability policies, timezone-boundary tests, load tests and integration tests remain to implement.
- `lottery_settings` holds the current price and `lottery_issuances.ticket_price_snapshot` preserves issuance price.
- Never expose the service-role key in HTML, browser JS or GitHub.

## Key routes
- GET/POST `/api/admin/lottery/users`
- POST `/api/admin/lottery/users/import` (JSON array of parsed usernames)
- GET/PATCH `/api/admin/lottery/settings`
- GET/POST `/api/admin/lottery/prefixes`
- GET/POST `/api/admin/lottery/draws`
- POST `/api/admin/lottery/tickets/preview`
- POST `/api/admin/lottery/tickets/issue`
- GET `/api/admin/lottery/tickets?from=YYYY-MM-DD&to=YYYY-MM-DD&page=0`
- GET `/api/admin/lottery/tickets/cancel-preview?date=YYYY-MM-DD`
- POST `/api/admin/lottery/tickets/cancel-user-day`
- POST `/api/admin/lottery/tickets/cancel-day`
- GET `/api/admin/lottery/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`
- GET `/api/admin/lottery/audit`

## Operational note
Do not run a real-money lottery until legal/compliance requirements are verified and all outstanding security work and tests are complete.
