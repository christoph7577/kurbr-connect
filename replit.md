# KURBR

On-demand junk hauling dispatch platform. Customers book junk removal jobs; haulers receive and complete them; admins manage everything from a dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/kurbr run dev` — run the frontend (port assigned by Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — Clerk auth (server)
- Required env: `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth (frontend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v3
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (clerkMiddleware on API, ClerkProvider + useUser/useClerk on frontend)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kurbr/` — React+Vite frontend
- `artifacts/api-server/` — Express 5 API server
- `artifacts/api-server/src/routes/` — jobs.ts, haulers.ts, profile.ts
- `lib/db/src/schema/index.ts` — Drizzle DB schema (jobs, hauler_profiles, profiles)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `artifacts/kurbr/src/contexts/AuthContext.tsx` — Clerk-based auth context
- `artifacts/kurbr/src/lib/apiClient.ts` — fetch helpers (apiGet/apiPost/apiPatch)

## Architecture decisions

- Supabase replaced entirely: Drizzle+PostgreSQL for data, Clerk for auth, Express for API
- Clerk auth: frontend uses `useUser`/`useClerk` hooks; API uses `clerkMiddleware` + `getAuth(req)`; no manual JWT handling — Clerk session cookie flows through automatically with `credentials: "include"`
- Supabase realtime replaced with `setInterval` polling (10s admin/hauler, 15s tracking)
- Admin role stored in Clerk `publicMetadata.role === "admin"` — must be set via Clerk Dashboard
- HaulerOnboarding creates a temp userId (`pending_email_timestamp`) since onboarding is pre-auth
- Auth pages use `useClerk()` directly (not `useSignIn`/`useSignUp` signals) for programmatic sign-in/sign-up flows — Clerk v6 signal API is incompatible with imperative patterns

## Product

- **Landing page** — hero with live ETA widget, services, pricing, booking CTA
- **Admin dashboard** — job list, status management, hauler assignment, hauler management
- **Hauler dashboard** — assigned jobs, status updates, earnings view
- **Hauler onboarding** — multi-step form to apply as a hauler
- **Tracking page** — public job tracking by job number
- **Schedule page** — booking/scheduling interface

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Clerk v6 (`@clerk/react` 6.x) uses a signal-based API for `useSignIn`/`useSignUp` — use `useClerk()` for programmatic flows instead
- `react-day-picker` v9 uses different component/className keys than v8 (e.g. `Chevron` not `IconLeft`/`IconRight`, `month_caption` not `caption`, etc.)
- DB schema uses camelCase field names in Drizzle; API returns camelCase JSON
- Always run `pnpm --filter @workspace/db run push` after schema changes before starting API server

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
