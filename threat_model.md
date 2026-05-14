# Threat Model

## Project Overview

KURBR is an on-demand junk hauling platform with a React web app, an Expo mobile app, an Express 5 API, PostgreSQL via Drizzle, Clerk authentication, Google Cloud object storage, Anthropic image-based pricing, and email/SMS notifications. Customers can book jobs and track them publicly by token, haulers can manage assigned jobs and share live location, and admins can view and manage all jobs and hauler profiles.

Production security analysis should focus on the Express API in `artifacts/api-server/`, the web client in `artifacts/kurbr/`, the mobile client in `artifacts/kurbr-mobile/`, and shared DB schema in `lib/db/`. `artifacts/mockup-sandbox/` is development-only and should be ignored unless separate evidence shows it is production-reachable. Assume `NODE_ENV=production` in deployed environments and TLS is handled by the platform.

## Assets

- **Customer PII** — names, email addresses, phone numbers, service addresses, booking notes, and tracking links. Exposure would reveal pickup locations and contact details.
- **Live operational data** — job status, assigned hauler identity, and real-time hauler coordinates during active jobs. Exposure would leak customer schedules and physical location information.
- **Privileged management capabilities** — admin-only job assignment, status changes, hauler approvals, and access to the full job list. Abuse would let attackers manipulate dispatch operations.
- **Hauler application data** — license numbers, vehicle information, service areas, and onboarding documents metadata.
- **Application secrets and third-party credentials** — Clerk secret key, database connection string, Resend/Twilio connector secrets, Anthropic credentials, and object-storage access.
- **Cost-bearing resources** — Anthropic inference calls, object storage writes/reads, email/SMS sends, and database capacity. Abuse can create direct financial loss or service degradation.

## Trust Boundaries

- **Browser/mobile client to API** — all user input crosses from untrusted clients into the Express API. The API must authenticate, authorize, validate, and rate-limit requests.
- **Public to authenticated boundary** — booking, photo upload, AI estimation, health, and tracking routes are public; profile, hauler, and internal job-management routes require authentication.
- **Authenticated to admin boundary** — admins can view and mutate all jobs and haulers; regular users and haulers must not reach these capabilities.
- **Authenticated hauler to customer-data boundary** — haulers should only access jobs assigned to their own hauler profile and only update permitted fields.
- **API to PostgreSQL** — the API has broad access to operational and PII data; query construction and row scoping must be safe.
- **API to third parties** — the server calls Clerk, Anthropic, Google Cloud Storage, Resend, and Twilio. User-controlled data must not let attackers misuse these integrations.
- **Internal/dev-only to production boundary** — mockup and local build tooling are out of production scope unless a production code path invokes them.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/kurbr/src/main.tsx`, `artifacts/kurbr-mobile/server/serve.js`.
- **Highest-risk API files**: `artifacts/api-server/src/routes/jobs.ts`, `artifacts/api-server/src/routes/haulers.ts`, `artifacts/api-server/src/routes/profile.ts`, `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/lib/{storage,email,sms}.ts`.
- **Public surfaces**: `POST /api/jobs`, `POST /api/jobs/photos`, `POST /api/jobs/estimate`, `GET /api/jobs/track/:token`, `GET /api/jobs/photos/*`.
- **Admin surfaces**: `/api/jobs/stats`, admin `GET /api/jobs`, admin `PATCH /api/jobs/:id`, admin hauler listing and status changes.
- **Usually ignore as dev-only**: `artifacts/mockup-sandbox/`, mobile build scripts under `artifacts/kurbr-mobile/scripts/`, dist output unless needed to confirm deployed behavior.

## Threat Categories

### Spoofing

Authentication relies on Clerk sessions interpreted by `clerkMiddleware` and `getAuth(req)`. All protected API endpoints must require a valid Clerk-authenticated user, and admin-only routes must enforce admin status server-side rather than trusting client route guards or metadata echoed from the frontend.

### Tampering

Customers, haulers, and admins all submit mutable job data across the client/server boundary. The API must validate which fields each actor may control, must not trust client-supplied business-critical values such as pricing or assignment state without server-side checks, and must constrain file uploads and status transitions so untrusted users cannot rewrite operational records arbitrarily.

### Information Disclosure

The application stores customer addresses, contact details, job notes, hauler onboarding data, and live hauler coordinates. Public tracking and media-serving endpoints must expose only the minimum data needed, tracking tokens must remain unguessable and carefully handled, and storage/email/logging flows must not leak sensitive data or secrets.

### Denial of Service

Several public routes can trigger expensive work: multipart uploads, object-storage access, AI image analysis, booking creation, and public tracking polls. These endpoints need request-size controls, concurrency/rate controls, and abuse-resistant behavior so anonymous users cannot create unbounded financial or infrastructure load.

### Elevation of Privilege

The highest-risk privilege boundaries are customer/public to internal operations, authenticated user to hauler, and hauler to admin. The API must enforce row-level authorization on every job, notes, and hauler route; admin-only actions must be unreachable to non-admin users; and any integration path that can access storage, notifications, or database state must not be indirectly controllable by untrusted users.
